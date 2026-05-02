import crypto from 'crypto';
import type { Request } from 'express';
import db from '../db/index.js';
import config from '../config/index.js';
import { ApiTokenService } from './api-token.service.js';

export type SepayWebhookAuthMode = 'none' | 'api_key' | 'oauth2';

type SepayWebhookSettingsRecord = {
  id: number;
  auth_mode: string;
  api_key: string;
  oauth_bearer_token: string;
  updated_by: number | null;
  created_at: Date;
  updated_at: Date;
};

type SepayWebhookSettingsPayload = {
  authMode?: SepayWebhookAuthMode;
  apiKey?: string;
  oauthBearerToken?: string;
};

type EffectiveSepayWebhookSettings = {
  authMode: SepayWebhookAuthMode;
  apiKey: string;
  oauthBearerToken: string;
};

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function normalizeMode(value: unknown): SepayWebhookAuthMode {
  const mode = normalizeText(value).toLowerCase();
  if (mode === 'none' || mode === 'api_key' || mode === 'oauth2') {
    return mode;
  }
  return 'api_key';
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function extractAuthHeader(req: Request): string {
  return normalizeText(req.headers['authorization']);
}

function extractGenericToken(req: Request): { token: string; source: string } {
  const authHeader = extractAuthHeader(req);
  const authToken = authHeader
    .replace(/^apikey\s+/i, '')
    .replace(/^bearer\s+/i, '')
    .trim();

  const token = normalizeText(
    req.headers['x-api-token'] ||
    req.headers['x-api-key'] ||
    authToken ||
    req.query.token ||
    ''
  );

  const source = req.headers['x-api-token']
    ? 'x-api-token'
    : req.headers['x-api-key']
      ? 'x-api-key'
      : authToken
        ? 'authorization'
        : req.query.token
          ? 'query.token'
          : 'none';

  return { token, source };
}

function extractBearerToken(req: Request): { token: string; source: string } {
  const authHeader = extractAuthHeader(req);
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return {
    token: normalizeText(match?.[1] || ''),
    source: match ? 'authorization.bearer' : 'none',
  };
}

async function validateLegacyApiToken(token: string) {
  const tokenRow = await ApiTokenService.validateToken(token);
  if (tokenRow) {
    await ApiTokenService.recordTokenUsage(token);
  }
  return tokenRow;
}

function normalizeRecord(record: SepayWebhookSettingsRecord): EffectiveSepayWebhookSettings {
  return {
    authMode: normalizeMode(record.auth_mode),
    apiKey: String(record.api_key || ''),
    oauthBearerToken: String(record.oauth_bearer_token || ''),
  };
}

export class SepayWebhookSettingsService {
  static async getStoredSettings(): Promise<SepayWebhookSettingsRecord | null> {
    try {
      const record = await db('sepay_webhook_settings').orderBy('id', 'desc').first();
      return record || null;
    } catch (error: any) {
      const code = String(error?.code || '');
      const message = String(error?.message || '').toLowerCase();
      const missingTable = code === 'ER_NO_SUCH_TABLE' || message.includes('sepay_webhook_settings');
      if (missingTable) {
        return null;
      }
      throw error;
    }
  }

  static async hasLegacyApiTokens(): Promise<boolean> {
    const tokenRow = await db('api_tokens').first('id');
    return Boolean(tokenRow);
  }

  static async getEffectiveSettings(): Promise<EffectiveSepayWebhookSettings> {
    const stored = await this.getStoredSettings();
    if (stored) {
      return normalizeRecord(stored);
    }

    return {
      authMode: normalizeMode(config.sepayWebhook.authMode),
      apiKey: String(config.sepayWebhook.apiKey || ''),
      oauthBearerToken: String(config.sepayWebhook.oauthBearerToken || ''),
    };
  }

  static async getAdminViewSettings() {
    const stored = await this.getStoredSettings();
    const effective = await this.getEffectiveSettings();
    const hasLegacyTokens = await this.hasLegacyApiTokens();

    return {
      authMode: effective.authMode,
      hasApiKey: Boolean(effective.apiKey),
      hasOAuthBearerToken: Boolean(effective.oauthBearerToken),
      source: stored ? 'database' : 'environment',
      hasLegacyTokens,
    };
  }

  static async updateSettings(payload: SepayWebhookSettingsPayload, actorUserId?: number | null) {
    const stored = await this.getStoredSettings();
    const current = stored ? normalizeRecord(stored) : await this.getEffectiveSettings();

    const next: EffectiveSepayWebhookSettings = {
      authMode: payload.authMode === undefined ? current.authMode : normalizeMode(payload.authMode),
      apiKey: payload.apiKey === undefined ? current.apiKey : String(payload.apiKey || '').trim(),
      oauthBearerToken: payload.oauthBearerToken === undefined ? current.oauthBearerToken : String(payload.oauthBearerToken || '').trim(),
    };

    if (next.authMode === 'oauth2' && !next.oauthBearerToken) {
      throw new Error('OAuth 2.0 / Bearer token là bắt buộc khi chọn kiểu chứng thực này');
    }

    if (stored) {
      await db('sepay_webhook_settings')
        .where('id', stored.id)
        .update({
          auth_mode: next.authMode,
          api_key: next.apiKey,
          oauth_bearer_token: next.oauthBearerToken,
          updated_by: actorUserId ?? null,
          updated_at: db.fn.now(),
        });
    } else {
      await db('sepay_webhook_settings').insert({
        auth_mode: next.authMode,
        api_key: next.apiKey,
        oauth_bearer_token: next.oauthBearerToken,
        updated_by: actorUserId ?? null,
      });
    }

    return this.getAdminViewSettings();
  }

  static async authenticateRequest(req: Request) {
    const settings = await this.getEffectiveSettings();

    if (settings.authMode === 'none') {
      return { isAnonymous: true, authMode: 'none' as const };
    }

    if (settings.authMode === 'oauth2') {
      const { token, source } = extractBearerToken(req);
      const isValid = Boolean(token) && Boolean(settings.oauthBearerToken) && safeEqual(token, settings.oauthBearerToken);

      console.log('[WEBHOOK][AUTH]', {
        mode: 'oauth2',
        tokenSource: source,
        hasToken: Boolean(token),
      });

      if (isValid) {
        console.log('[WEBHOOK][AUTH_RESULT]', { mode: 'oauth2', isValid: true, via: 'configured_oauth_token' });
        return { isOAuth2: true, authMode: 'oauth2' as const };
      }

      const legacyTokenRow = await validateLegacyApiToken(token);
      console.log('[WEBHOOK][AUTH_RESULT]', { mode: 'oauth2', isValid: Boolean(legacyTokenRow), via: 'legacy_api_token' });

      return legacyTokenRow;
    }

    const { token, source } = extractGenericToken(req);

    console.log('[WEBHOOK][AUTH]', {
      mode: 'api_key',
      tokenSource: source,
      hasToken: Boolean(token),
    });

    if (settings.apiKey) {
      const isValid = Boolean(token) && safeEqual(token, settings.apiKey);
      if (isValid) {
        console.log('[WEBHOOK][AUTH_RESULT]', { mode: 'api_key', isValid: true, via: 'configured_api_key' });
        return { isConfiguredApiKey: true, authMode: 'api_key' as const };
      }
    }

    const tokenRow = await validateLegacyApiToken(token);

    console.log('[WEBHOOK][AUTH_RESULT]', { mode: 'api_key', isValid: Boolean(tokenRow), via: 'legacy_api_token' });

    return tokenRow;
  }
}