import { Router, type Request, type Response } from 'express';
import { authenticateToken, authorizeRoles, type AuthRequest } from '../middleware/auth.js';
import { ApiTokenService } from '../services/api-token.service.js';
import { BankTransferService } from '../services/bank-transfer.service.js';
import { DevModeService } from '../services/dev-mode.service.js';
import { mqttService } from '../services/mqtt.service.js';
import { SmtpSettingsService } from '../services/smtp-settings.service.js';

const router = Router();

function parsePrimitive(value: string) {
  const trimmed = value.trim();
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function parseMultipartLikeBody(rawBody: string) {
  const result: Record<string, any> = {};
  const fieldRegex = /Content-Disposition:[^\n]*name="([^"]+)"[^\n]*\r?\n(?:Content-Type:[^\n]*\r?\n)?\r?\n([\s\S]*?)(?=\r?\n--)/g;

  let match: RegExpExecArray | null = null;
  while ((match = fieldRegex.exec(rawBody)) !== null) {
    const key = match[1];
    const value = parsePrimitive(match[2] || '');
    result[key] = value;
  }

  return result;
}

function parseRawWebhookBody(rawBody: string) {
  const raw = String(rawBody || '').trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    // noop
  }

  if (raw.includes('Content-Disposition:') && raw.includes('name="')) {
    return parseMultipartLikeBody(raw);
  }

  try {
    const params = new URLSearchParams(raw);
    const parsed: Record<string, any> = {};
    for (const [key, value] of params.entries()) {
      parsed[key] = parsePrimitive(value);
    }
    return parsed;
  } catch {
    return {};
  }
}

function resolveWebhookPayload(req: Request) {
  const rawBody = String((req as any).rawBody || '');
  const body = req.body;

  if (body && typeof body === 'object' && Object.keys(body).length > 0) {
    const keys = Object.keys(body);
    const singleKey = keys[0] || '';
    const singleValue = String((body as any)[singleKey] || '');
    const looksLikeMultipartBlob =
      keys.length === 1 &&
      (singleKey.includes('Content-Disposition') ||
        singleKey.startsWith('--------------------------') ||
        singleValue.includes('Content-Disposition:') ||
        singleValue.includes('--------------------------'));

    if (!looksLikeMultipartBlob) {
      return body;
    }

    // Body parser produced a malformed single-key object; parse from raw payload instead.
    const parsedFromRaw = parseRawWebhookBody(rawBody || `${singleKey}=${singleValue}`);
    if (Object.keys(parsedFromRaw).length > 0) {
      return parsedFromRaw;
    }
  }

  if (typeof body === 'string' && body.trim()) {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  return parseRawWebhookBody(rawBody);
}

async function handleWebhookAuth(req: Request, res: Response) {
  const authorized = await ApiTokenService.authenticateWebhookRequest(req);

  if (!authorized) {
    res.status(401).json({ error: 'Token API không hợp lệ hoặc chưa được cấu hình' });
    return false;
  }

  return true;
}

router.post('/webhook/bank-transfer', async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = resolveWebhookPayload(req);
  const isDevTestHeader = String(req.headers['x-dev-test'] || '').toLowerCase() === 'true';

  console.log('[WEBHOOK][INCOMING]', {
    requestId,
    path: '/api/webhook/bank-transfer',
    contentType: req.headers['content-type'] || null,
    bodyType: typeof req.body,
    bodyKeys: Object.keys(payload || {}),
    isDevTestHeader,
    transferType: payload?.transferType,
    transactionId: payload?.id || payload?.transactionId || payload?.paymentId || null,
    referenceCode: payload?.referenceCode || null,
  });

  console.log('[WEBHOOK][RAW_BODY]', {
    requestId,
    rawBody: String((req as any).rawBody || '').slice(0, 8000),
  });

  console.log('[WEBHOOK][PAYLOAD_PARSED]', {
    requestId,
    payload,
  });

  if (isDevTestHeader && !DevModeService.isEnabled()) {
    console.warn('[WEBHOOK][REJECTED]', { requestId, reason: 'dev_mode_disabled' });
    res.status(401).json({ error: 'Token API không hợp lệ hoặc chưa được cấu hình' });
    return;
  }

  if (isDevTestHeader && !mqttService.getStatus()) {
    console.warn('[WEBHOOK][REJECTED]', { requestId, reason: 'mqtt_not_connected_for_dev_test' });
    res.status(503).json({ error: 'MQTT chưa kết nối, không thể gửi lệnh' });
    return;
  }

  if (!(await handleWebhookAuth(req, res))) {
    console.warn('[WEBHOOK][REJECTED]', { requestId, reason: 'auth_failed' });
    return;
  }

  try {
    const result = await BankTransferService.processIncomingTransfer(payload, {
      isTest: isDevTestHeader || payload?.isTest === true,
      requestId,
    });
    console.log('[WEBHOOK][DONE]', {
      requestId,
      success: result?.success === true,
      ignored: result?.ignored === true,
      duplicate: result?.duplicate === true,
      mqttQueued: result?.mqttQueued ?? null,
      mqttTopic: result?.mqttTopic ?? null,
      message: result?.message ?? null,
    });
    res.json(result);
  } catch (error: any) {
    console.error('[WEBHOOK][ERROR]', {
      requestId,
      message: error?.message || 'Lỗi xử lý webhook',
      stack: error?.stack || null,
    });
    res.status(400).json({ error: error.message || 'Lỗi xử lý webhook' });
  }
});

router.post('/webhook/outgoing-payment', async (req, res) => {
  if (!(await handleWebhookAuth(req, res))) {
    return;
  }

  try {
    const result = await BankTransferService.addOutgoingTransaction(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Lỗi xử lý outgoing payment' });
  }
});

router.use(authenticateToken);

router.get('/tokens', authorizeRoles(['sa', 'engineer']), async (_req, res, next) => {
  try {
    const tokens = await ApiTokenService.getTokensDisplay();
    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

router.post('/tokens/create', authorizeRoles(['sa', 'engineer']), async (req, res) => {
  try {
    const { name, expiresInDays } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'Tên token không được để trống' });
      return;
    }

    const { plainToken, tokenData } = await ApiTokenService.createToken(String(name), Number(expiresInDays) || undefined);
    res.json({
      success: true,
      token: plainToken,
      fullToken: plainToken,
      expiresAt: tokenData.expiresAt,
      message: 'TOKEN CHI HIEN THI MOT LAN'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Lỗi tạo token' });
  }
});

router.post('/tokens/delete', authorizeRoles(['sa', 'engineer']), async (req, res) => {
  try {
    await ApiTokenService.deleteToken(String(req.body.tokenId || ''));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi xóa token' });
  }
});

router.get('/tokens/dev-mode/status', authorizeRoles(['sa', 'engineer']), (_req, res) => {
  res.json(DevModeService.getStatus());
});

router.post('/tokens/dev-mode/toggle', authorizeRoles(['sa', 'engineer']), (_req, res) => {
  const enabled = DevModeService.toggle();
  res.json({
    success: true,
    devModeEnabled: enabled,
    message: enabled ? 'Dev Mode ON' : 'Dev Mode OFF'
  });
});

router.get('/mqtt-status', authorizeRoles(['sa', 'engineer']), (_req, res) => {
  res.json({ connected: mqttService.getStatus() });
});

router.post('/settings/refresh', authorizeRoles(['sa', 'engineer']), async (_req, res, next) => {
  try {
    await mqttService.refresh();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/settings/mqtt', authorizeRoles(['sa', 'engineer']), async (req, res, next) => {
  try {
    const { mqttBroker, mqttUser, mqttPass } = req.body;
    await mqttService.initialize({
      brokerUrl: mqttBroker,
      username: mqttUser,
      password: mqttPass
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/settings/smtp', authorizeRoles(['sa']), async (_req, res, next) => {
  try {
    const data = await SmtpSettingsService.getAdminViewSettings();
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/settings/smtp', authorizeRoles(['sa']), async (req: AuthRequest, res, next) => {
  try {
    const data = await SmtpSettingsService.updateSettings({
      enabled: req.body?.enabled,
      host: req.body?.host,
      port: req.body?.port,
      secure: req.body?.secure,
      user: req.body?.user,
      pass: req.body?.pass,
      from: req.body?.from,
    }, req.user?.id || null);
    res.json({
      message: 'Đã cập nhật cấu hình SMTP',
      data,
    });
  } catch (error: any) {
    if (error.message) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

router.get('/test-transactions', authorizeRoles(['sa', 'engineer']), async (req: AuthRequest, res, next) => {
  try {
    const transactions = await BankTransferService.getTestTransactions(50, req.user?.role === 'agency' ? req.user.agencyId : null);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

router.get('/outgoing-transactions', authorizeRoles(['sa', 'engineer']), async (_req, res, next) => {
  try {
    const transactions = await BankTransferService.getOutgoingTransactions(50);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

router.get('/integration-transactions', authorizeRoles(['sa', 'engineer']), async (req: AuthRequest, res, next) => {
  try {
    const transactions = await BankTransferService.getTransactions(50, req.user?.role === 'agency' ? req.user.agencyId : null);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

export default router;
