import crypto from 'crypto';
import type { Request } from 'express';
import db from '../db/index.js';
import { DevModeService } from './dev-mode.service.js';

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
    const tokens = await db('api_tokens').select('*').orderBy('created_at', 'desc');

    return tokens.map((token) => ({
      id: token.id,
      name: token.name,
      token: maskToken(token.token_hash),
      createdAt: token.created_at,
      expiresAt: token.expires_at || null,
      isActive: !token.expires_at || new Date(token.expires_at) > new Date(),
      usageCount: token.usage_count || 0,
      lastUsed: token.last_used || null
    }));
  }

  static async createToken(name: string, expiresInDays?: number) {
    const plainToken = this.generateToken(32);
    const id = Date.now().toString();
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null;

    await db('api_tokens').insert({
      id,
      name,
      token: plainToken,
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

  static async deleteToken(tokenId: string) {
    await db('api_tokens').where('id', tokenId).del();
  }

  static async validateToken(token: string) {
    if (!token) {
      return false;
    }

    const tokenRow = await db('api_tokens').where('token_hash', hashToken(token)).first();

    if (!tokenRow) {
      return false;
    }

    if (tokenRow.expires_at && new Date(tokenRow.expires_at) <= new Date()) {
      return false;
    }

    return true;
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
      return true;
    }

    const hasAnyToken = await db('api_tokens').first('id');

    if (!hasAnyToken) {
      return false;
    }

    const token = String(
      req.headers['x-api-token'] ||
      req.headers['x-api-key'] ||
      req.query.token ||
      ''
    );

    const isValid = await this.validateToken(token);
    if (isValid) {
      await this.recordTokenUsage(token);
    }

    return isValid;
  }
}