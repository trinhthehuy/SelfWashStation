import db from '../db/index.js';
import { mqttService } from './mqtt.service.js';
import { aggregationService } from './aggregation.service.js';

function normalizeText(value: string) {
  return String(value || '').toUpperCase().replace(/\s+/g, '');
}

function normalizeAccountNumber(value: unknown) {
  return String(value || '').replace(/\D/g, '').trim();
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  const normalized = String(value)
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .trim();

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickFirst(payload: any, paths: string[]) {
  for (const path of paths) {
    const segments = path.split('.');
    let current: any = payload;

    for (const segment of segments) {
      if (current == null) {
        current = undefined;
        break;
      }
      current = current[segment];
    }

    if (current !== undefined && current !== null && String(current).trim() !== '') {
      return current;
    }
  }

  return undefined;
}

function formatTimestamp(value?: string) {
  const date = value ? new Date(String(value).replace(' ', 'T')) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  const day = String(safeDate.getDate()).padStart(2, '0');
  const hours = String(safeDate.getHours()).padStart(2, '0');
  const minutes = String(safeDate.getMinutes()).padStart(2, '0');
  const seconds = String(safeDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getBayCode(content: string, prefix: string) {
  const normalizedContent = normalizeText(content);
  const normalizedPrefix = normalizeText(prefix);
  const match = normalizedContent.match(new RegExp(`${normalizedPrefix}BY(\\d+)`, 'i'));

  if (!match?.[1]) {
    return '';
  }

  return `BY${match[1].padStart(2, '0')}`;
}

function getStationAccountList(station: any) {
  const accounts = [station.account_number]
    .map((account) => normalizeAccountNumber(account))
    .filter(Boolean);

  return Array.from(new Set(accounts));
}

export class BankTransferService {
  static async getStationStrategies() {
    const rows = await db('stations as s')
      .select(
        's.id',
        's.station_name',
        's.address',
        's.transfer_prefix',
        's.is_active',
        's.agency_id',
        'b.account_number',
        'b.bank_name',
        'b.account_name',
        'st.amount_per_unit',
        'st.op_per_unit',
        'st.foam_per_unit',
        'wb.bay_code',
        'wb.bay_status'
      )
      .leftJoin('bank_account as b', 's.bank_account_id', 'b.id')
      .leftJoin('strategy as st', 's.strategy_id', 'st.id')
      .leftJoin('wash_bays as wb', 'wb.station_id', 's.id')
      .orderBy('s.id', 'asc')
      .orderBy('wb.bay_code', 'asc');

    return rows.reduce<Record<string, any>>((accumulator, row) => {
      const stationKey = String(row.id);

      if (!accumulator[stationKey]) {
        accumulator[stationKey] = {
          id: row.id,
          stationId: row.id,
          name: row.address || row.station_name,
          transferPrefix: row.transfer_prefix,
          amountPerUnit: Number(row.amount_per_unit || 0),
          opPerUnit: Number(row.op_per_unit || 0),
          foamPerUnit: Number(row.foam_per_unit || 0),
          bankAccount: {
            bankName: row.bank_name || '',
            accountNumber: row.account_number || '',
            accountHolder: row.account_name || ''
          },
          enabled: Boolean(row.is_active),
          agencyId: row.agency_id,
          bays: []
        };
      }

      if (row.bay_code) {
        accumulator[stationKey].bays.push({
          id: row.bay_code,
          bay_code: row.bay_code,
          status: row.bay_status || 'active'
        });
      }

      return accumulator;
    }, {});
  }

  static calculateWashTimes(amount: number, strategy: any) {
    const amountPerUnit = Number(strategy.amountPerUnit || 0);
    if (!amountPerUnit) {
      return { op: 0, foam: 0 };
    }

    const units = amount / amountPerUnit;

    return {
      op: Math.floor(units * Number(strategy.opPerUnit || 0)),
      foam: Math.floor(units * Number(strategy.foamPerUnit || 0))
    };
  }

  static formatMqttMessage(bayCode: string, op: number, foam: number, transactionTime: string) {
    return `${bayCode},enable,op=${op},foam=${foam},${formatTimestamp(transactionTime)}`;
  }

  static async markProcessedWebhook(dedupeKey: string, payload?: unknown) {
    try {
      await db('processed_webhooks').insert({
        dedupe_key: dedupeKey,
        payload: JSON.stringify(payload || null)
      });
      return { isDuplicate: false };
    } catch (error: any) {
      if (String(error?.code || '').includes('DUP')) {
        return { isDuplicate: true };
      }

      throw error;
    }
  }

  static async processIncomingTransfer(payload: any, options?: { isTest?: boolean }) {
    const amountRaw = pickFirst(payload, [
      'amount',
      'transferAmount',
      'transfer_amount',
      'data.amount',
      'data.transferAmount',
      'data.transfer_amount'
    ]);
    const contentRaw = pickFirst(payload, [
      'content',
      'description',
      'transactionContent',
      'transferContent',
      'data.content',
      'data.description',
      'data.transactionContent',
      'data.transferContent'
    ]);
    const timestampRaw = pickFirst(payload, [
      'transactionDate',
      'timestamp',
      'createdAt',
      'created_at',
      'data.transactionDate',
      'data.timestamp',
      'data.createdAt',
      'data.created_at'
    ]);
    const accountRaw = pickFirst(payload, [
      'accountNumber',
      'accountNo',
      'bankAccount',
      'toAccountNumber',
      'data.accountNumber',
      'data.accountNo',
      'data.bankAccount',
      'data.toAccountNumber'
    ]);

    let amount = toNumber(amountRaw);
    let content = String(contentRaw || '');
    let timestamp = String(timestampRaw || new Date().toISOString());
    let accountNumber = normalizeAccountNumber(accountRaw);

    if (payload.transferAmount && payload.transferType && payload.transferType !== 'in') {
      throw new Error('Chỉ xử lý giao dịch tiền vào');
    }

    if (!amount || !content) {
      throw new Error('Dữ liệu webhook không hợp lệ');
    }

    const dedupeKey = String(
      payload.transactionId ||
      payload.id ||
      payload.paymentId ||
      `${accountNumber || 'unknown'}|${amount}|${content}|${timestamp}`
    );

    const dedupe = await this.markProcessedWebhook(dedupeKey, payload);
    if (dedupe.isDuplicate) {
      return {
        success: true,
        duplicate: true,
        message: 'Webhook trùng lặp đã bị bỏ qua'
      };
    }

    const strategies = await this.getStationStrategies();
    const normalizedContent = normalizeText(content);
    const matchedStation = Object.values(strategies).find((station: any) => {
      return normalizedContent.includes(normalizeText(station.transferPrefix || station.stationId));
    }) as any;

    if (!matchedStation) {
      throw new Error('Không tìm thấy mã trạm trong nội dung chuyển khoản');
    }

    const stationAccounts = getStationAccountList(matchedStation);
    if (stationAccounts.length > 0 && accountNumber && !stationAccounts.includes(accountNumber)) {
      throw new Error('Số tài khoản nhận không thuộc trạm trong nội dung chuyển khoản');
    }

    let bayCode = getBayCode(content, matchedStation.transferPrefix || String(matchedStation.stationId));
    if (!bayCode) {
      bayCode = matchedStation.bays[0]?.id || '';
    }

    if (!bayCode || !matchedStation.bays.some((bay: any) => bay.id === bayCode)) {
      throw new Error('Không xác định được trụ rửa hợp lệ');
    }

    const { op, foam } = this.calculateWashTimes(amount, matchedStation);
    const mqttPayload = this.formatMqttMessage(bayCode, op, foam, timestamp);
    const mqttTopic = `${matchedStation.transferPrefix}/cmd`;
    const mqttQueued = await mqttService.publish(mqttTopic, mqttPayload);
    const isTest = options?.isTest === true || payload.isTest === true;

    const transactionPayload = {
      transaction_id: Date.now().toString(),
      original_payload: JSON.stringify(payload || null),
      amount,
      content,
      account_number: accountNumber || null,
      station_id: matchedStation.stationId,
      bay_code: bayCode,
      op,
      foam,
      mqtt_topic: mqttTopic,
      mqtt_payload: mqttPayload,
      source: payload.transferAmount ? 'sepay' : 'webhook',
      status: 'processed',
      is_test: isTest ? 1 : 0,
      transaction_time: formatTimestamp(timestamp)
    };

    if (isTest) {
      await db('test_transactions').insert({
        transaction_id: transactionPayload.transaction_id,
        amount,
        content,
        account_number: accountNumber || null,
        station_id: matchedStation.stationId,
        bay_code: bayCode,
        op,
        foam,
        mqtt_topic: mqttTopic,
        mqtt_payload: mqttPayload,
        transaction_time: formatTimestamp(timestamp),
        notes: 'Generated from system test'
      });
    } else {
      await db('transactions').insert(transactionPayload);
      // Cập nhật summary ngay lập tức (Real-time)
      await aggregationService.incrementSummary(transactionPayload);
    }

    await db('webhook_logs').insert({
      webhook_path: '/api/webhook/bank-transfer',
      payload: JSON.stringify(payload || null),
      result_status: 200,
      result_body: JSON.stringify({ mqttQueued }),
      is_duplicate: 0,
      is_test: isTest ? 1 : 0
    });

    return {
      success: true,
      stationId: matchedStation.stationId,
      stationName: matchedStation.name,
      bayCode,
      mqttTopic,
      mqttPayload,
      mqttQueued,
      mqttMessage: mqttPayload,
      message: mqttQueued ? 'Lệnh MQTT đã được gửi' : 'MQTT chưa kết nối'
    };
  }

  static async addOutgoingTransaction(payload: any) {
    const id = Date.now().toString();
    await db('outgoing_transactions').insert({
      id,
      payload: JSON.stringify(payload || null),
      status: 'processed',
      processed_at: db.fn.now()
    });

    return { success: true, id };
  }

  static async getTransactions(limit: number = 50, agencyId?: number | null) {
    const query = db('transactions as t')
      .select('t.*', 's.station_name')
      .leftJoin('stations as s', 't.station_id', 's.id')
      .orderBy('t.created_at', 'desc')
      .limit(limit);

    if (agencyId) {
      query.where('s.agency_id', agencyId);
    }

    return query;
  }

  static async getTestTransactions(limit: number = 50, agencyId?: number | null) {
    const query = db('test_transactions as t')
      .select('t.*', 's.station_name')
      .leftJoin('stations as s', 't.station_id', 's.id')
      .orderBy('t.created_at', 'desc')
      .limit(limit);

    if (agencyId) {
      query.where('s.agency_id', agencyId);
    }

    return query;
  }

  static async getOutgoingTransactions(limit: number = 50) {
    return db('outgoing_transactions').select('*').orderBy('received_at', 'desc').limit(limit);
  }
}
