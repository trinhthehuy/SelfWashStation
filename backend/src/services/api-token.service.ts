import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import db from '../db/index.js';
import config from '../config/index.js';
import { DevModeService } from './dev-mode.service.js';

const WEBHOOK_OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS = 3600;

type WebhookOAuthAccessTokenPayload = {
  sub: string;
  type: 'sepay_webhook_oauth';
  agencyId: number | null;
};

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function maskToken(tokenHash: string) {
  return `${tokenHash.slice(0, 8)}...${tokenHash.slice(-8)}`;
}

export class ApiTokenService {
  static generateToken(length: number = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';

    for (let index = 0; index < length; index += 1) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return token;
  }

  static async getTokensDisplay() {
    const tokens = await db('api_tokens as t')
      .select('t.*', 'a.agency_name')
      .leftJoin('agency as a', 't.agency_id', 'a.id')
      .orderBy('t.created_at', 'desc');

    return tokens.map((token) => ({
      id: token.id,
      name: token.name,
      agencyId: token.agency_id,
      agencyName: token.agency_name || 'Global',
      token: maskToken(token.token_hash),
      createdAt: token.created_at,
      expiresAt: token.expires_at || null,
      isActive: !token.expires_at || new Date(token.expires_at) > new Date(),
      usageCount: token.usage_count || 0,
      lastUsed: token.last_used || null
    }));
  }

  static async createToken(name: string, expiresInDays?: number, agencyId?: number) {
    const plainToken = this.generateToken(32);
    const id = Date.now().toString();
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null;

    await db('api_tokens').insert({
      id,
      name,
      agency_id: agencyId || null,
      token_hash: hashToken(plainToken),
      permissions: null,
      usage_count: 0,
      last_used: null,
      expires_at: expiresAt
    });

    return {
      plainToken,
      tokenData: {
        id,
        name,
        expiresAt
      }
    };
  }

  static async validateTokenById(tokenId: string, plainToken: string) {
    if (!tokenId || !plainToken) {
      return null;
    }

    const tokenRow = await db('api_tokens').where('id', String(tokenId).trim()).first();

    if (!tokenRow) {
      return null;
    }

    if (tokenRow.expires_at && new Date(tokenRow.expires_at) <= new Date()) {
      return null;
    }

    return tokenRow.token_hash === hashToken(plainToken) ? tokenRow : null;
  }

  static createWebhookOAuthAccessToken(tokenRow: { id: string; agency_id?: number | null }) {
    return jwt.sign({
      sub: String(tokenRow.id),
      type: 'sepay_webhook_oauth',
      agencyId: tokenRow.agency_id ?? null,
    } satisfies WebhookOAuthAccessTokenPayload, config.jwtSecret, {
      expiresIn: WEBHOOK_OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    });
  }

  static async validateWebhookOAuthAccessToken(accessToken: string) {
    if (!accessToken) {
      return null;
    }

    try {
      const decoded = jwt.verify(accessToken, config.jwtSecret) as WebhookOAuthAccessTokenPayload & jwt.JwtPayload;
      if (decoded?.type !== 'sepay_webhook_oauth' || !decoded?.sub) {
        return null;
      }

      const tokenRow = await db('api_tokens').where('id', String(decoded.sub)).first();
      if (!tokenRow) {
        return null;
      }

      if (tokenRow.expires_at && new Date(tokenRow.expires_at) <= new Date()) {
        return null;
      }

      return {
        ...tokenRow,
        agency_id: decoded.agencyId ?? tokenRow.agency_id ?? null,
      };
    } catch {
      return null;
    }
  }

  static getWebhookOAuthAccessTokenExpiresInSeconds() {
    return WEBHOOK_OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS;
  }

  static async deleteToken(tokenId: string) {
    await db('api_tokens').where('id', tokenId).del();
  }

  static async validateToken(token: string) {
    if (!token) {
      return null;
    }

    const tokenRow = await db('api_tokens').where('token_hash', hashToken(token)).first();

    if (!tokenRow) {
      return null;
    }

    if (tokenRow.expires_at && new Date(tokenRow.expires_at) <= new Date()) {
      return null;
    }

    return tokenRow;
  }

  static async recordTokenUsage(token: string) {
    await db('api_tokens')
      .where('token_hash', hashToken(token))
      .update({
        usage_count: db.raw('usage_count + 1'),
        last_used: db.fn.now(),
        updated_at: db.fn.now()
      });
  }

  static async authenticateWebhookRequest(req: Request) {
    const hasDevTestHeader = String(req.headers['x-dev-test'] || '').toLowerCase() === 'true';

    if (DevModeService.isEnabled() && hasDevTestHeader) {
      return { isDev: true };
    }

    const hasAnyToken = await db('api_tokens').first('id');

    if (!hasAnyToken) {
      return null;
    }

    const authHeader = String(req.headers['authorization'] || '').trim();
    const authToken = authHeader
      .replace(/^apikey\s+/i, '')
      .replace(/^bearer\s+/i, '')
      .trim();

    const token = String(
      req.headers['x-api-token'] ||
      req.headers['x-api-key'] ||
      authToken ||
      req.query.token ||
      ''
    ).trim();

    const tokenSource = req.headers['x-api-token']
      ? 'x-api-token'
      : req.headers['x-api-key']
        ? 'x-api-key'
        : authToken
          ? 'authorization'
          : req.query.token
            ? 'query.token'
            : 'none';

    console.log('[WEBHOOK][AUTH]', {
      tokenSource,
      hasToken: Boolean(token),
    });

    const tokenRow = await this.validateToken(token);
    if (tokenRow) {
      await this.recordTokenUsage(token);
    }

    console.log('[WEBHOOK][AUTH_RESULT]', { isValid: Boolean(tokenRow) });

    return tokenRow;
  }
}
