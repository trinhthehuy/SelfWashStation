import db from '../db/index.js';
import config from '../config/index.js';

type SmtpSettingsRecord = {
  id: number;
  enabled: number | boolean;
  host: string;
  port: number;
  secure: number | boolean;
  user: string;
  pass: string;
  from_email: string;
  updated_by: number | null;
  created_at: Date;
  updated_at: Date;
};

type SmtpSettingsPayload = {
  enabled?: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
};

type EffectiveSmtpSettings = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function normalizePort(value: unknown): number {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (Number.isNaN(parsed)) {
    return 587;
  }
  return Math.min(Math.max(parsed, 1), 65535);
}

function normalizeRecord(record: SmtpSettingsRecord): EffectiveSmtpSettings {
  const user = normalizeText(record.user);
  const from = normalizeText(record.from_email) || user;

  return {
    enabled: toBool(record.enabled),
    host: normalizeText(record.host),
    port: normalizePort(record.port),
    secure: toBool(record.secure),
    user,
    pass: String(record.pass || ''),
    from,
  };
}

export class SmtpSettingsService {
  static async getStoredSettings(): Promise<SmtpSettingsRecord | null> {
    try {
      const record = await db('smtp_settings').orderBy('id', 'desc').first();
      return record || null;
    } catch (error: any) {
      const code = String(error?.code || '');
      const message = String(error?.message || '').toLowerCase();
      const missingTable = code === 'ER_NO_SUCH_TABLE' || message.includes('smtp_settings');
      if (missingTable) {
        return null;
      }
      throw error;
    }
  }

  static async getEffectiveSettings(): Promise<EffectiveSmtpSettings> {
    const stored = await this.getStoredSettings();
    if (stored) {
      return normalizeRecord(stored);
    }

    return {
      enabled: config.mail.enabled,
      host: normalizeText(config.mail.host),
      port: normalizePort(config.mail.port),
      secure: Boolean(config.mail.secure),
      user: normalizeText(config.mail.user),
      pass: String(config.mail.pass || ''),
      from: normalizeText(config.mail.from) || normalizeText(config.mail.user),
    };
  }

  static async getAdminViewSettings() {
    const stored = await this.getStoredSettings();
    const effective = await this.getEffectiveSettings();

    return {
      enabled: effective.enabled,
      host: effective.host,
      port: effective.port,
      secure: effective.secure,
      user: effective.user,
      from: effective.from,
      hasPassword: Boolean(effective.pass),
      source: stored ? 'database' : 'environment',
    };
  }

  static async updateSettings(payload: SmtpSettingsPayload, actorUserId?: number | null) {
    const stored = await this.getStoredSettings();
    const current = stored ? normalizeRecord(stored) : await this.getEffectiveSettings();

    const next: EffectiveSmtpSettings = {
      enabled: payload.enabled === undefined ? current.enabled : Boolean(payload.enabled),
      host: payload.host === undefined ? current.host : normalizeText(payload.host),
      port: payload.port === undefined ? current.port : normalizePort(payload.port),
      secure: payload.secure === undefined ? current.secure : Boolean(payload.secure),
      user: payload.user === undefined ? current.user : normalizeText(payload.user),
      pass: payload.pass === undefined ? current.pass : String(payload.pass || ''),
      from: payload.from === undefined ? current.from : normalizeText(payload.from),
    };

    if (!next.from) {
      next.from = next.user;
    }

    if (next.enabled) {
      if (!next.host || !next.user || !next.from) {
        throw new Error('SMTP bật thì bắt buộc nhập host, user và email gửi');
      }
      if (!next.pass) {
        throw new Error('SMTP bật thì bắt buộc nhập mật khẩu SMTP');
      }
    }

    if (stored) {
      await db('smtp_settings')
        .where('id', stored.id)
        .update({
          enabled: next.enabled,
          host: next.host,
          port: next.port,
          secure: next.secure,
          user: next.user,
          pass: next.pass,
          from_email: next.from,
          updated_by: actorUserId ?? null,
          updated_at: db.fn.now(),
        });
    } else {
      await db('smtp_settings').insert({
        enabled: next.enabled,
        host: next.host,
        port: next.port,
        secure: next.secure,
        user: next.user,
        pass: next.pass,
        from_email: next.from,
        updated_by: actorUserId ?? null,
      });
    }

    return this.getAdminViewSettings();
  }
}
