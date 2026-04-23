import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import config from '../config/index.js';
import { emailService } from './email.service.js';
import type { AuthUser, UserRole } from '../middleware/auth.js';

const getJwtSecret = () => process.env.JWT_SECRET || 'fallback_secret';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';
const getDefaultInitialPassword = () => process.env.DEFAULT_INITIAL_PASSWORD || '123456aA@';

type SystemUserRow = {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  email?: string | null;
  role: UserRole;
  agency_id: number | null;
  is_active: number;
  avatar?: string | null;
  last_login_at?: string | null;
  must_change_password?: number | boolean;
};

type SeedSystemAccount = {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  agencyId: number | null;
};

type PasswordResetTokenRow = {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date | string;
  used_at: Date | string | null;
};

type AgencyEmailRow = {
  email?: string | null;
};

async function resolveAgencyEmail(agencyId: number | null | undefined): Promise<string | null> {
  if (!agencyId) {
    return null;
  }

  const agency = await db<AgencyEmailRow>('agency').where('id', agencyId).first();
  const agencyEmail = String(agency?.email || '').trim().toLowerCase();
  return isValidEmail(agencyEmail) ? agencyEmail : null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function normalizeOptionalEmail(value: unknown): string | null {
  const email = String(value || '').trim().toLowerCase();
  if (!email) {
    return null;
  }
  return isValidEmail(email) ? email : null;
}

function buildFallbackEmailFromUsername(username: string): string {
  const localPart = String(username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 48);

  return `${localPart || 'user'}@no-email.local`;
}

async function resolveResetRecipientEmail(user: SystemUserRow): Promise<string> {
  const directEmail = String(user.email || '').trim().toLowerCase();
  if (isValidEmail(directEmail)) {
    return directEmail;
  }

  const usernameAsEmail = String(user.username || '').trim().toLowerCase();
  if (isValidEmail(usernameAsEmail)) {
    return usernameAsEmail;
  }

  if (user.agency_id) {
    const agencyEmail = await resolveAgencyEmail(user.agency_id);
    if (agencyEmail) {
      return agencyEmail;
    }
  }

  return '';
}

async function resolveRequiredAgencyEmail(agencyId: number | null | undefined): Promise<string> {
  const email = await resolveAgencyEmail(agencyId);
  if (!email) {
    throw new Error('Đại lý liên kết chưa có email hợp lệ');
  }
  return email;
}

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
};

const getDefaultSystemAccounts = (): SeedSystemAccount[] => {
  return [
    {
      username: getRequiredEnv('SEED_SA_USERNAME'),
      password: getRequiredEnv('SEED_SA_PASSWORD'),
      fullName: 'Super Admin',
      role: 'sa',
      agencyId: null
    },
    {
      username: getRequiredEnv('SEED_ENGINEER_USERNAME'),
      password: getRequiredEnv('SEED_ENGINEER_PASSWORD'),
      fullName: 'System Engineer',
      role: 'engineer',
      agencyId: null
    }
  ];
};

function sanitizeUser(user: SystemUserRow): AuthUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    agencyId: user.agency_id,
    avatar: user.avatar ?? null,
    mustChangePassword: Boolean(user.must_change_password)
  };
}

export class SystemAuthService {
  static async ensureSchema() {
    const hasSystemUsers = await db.schema.hasTable('system_users');

    if (!hasSystemUsers) {
      await db.schema.createTable('system_users', (table) => {
        table.increments('id').primary();
        table.string('username', 64).notNullable().unique();
        table.string('password_hash', 255).notNullable();
        table.string('full_name', 128).notNullable();
        table.string('email', 191).notNullable();
        table.enu('role', ['sa', 'engineer', 'agency']).notNullable();
        table.integer('agency_id').unsigned().nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.boolean('must_change_password').notNullable().defaultTo(false);
        table.timestamp('last_login_at').nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      });
    }

    if (hasSystemUsers && !(await db.schema.hasColumn('system_users', 'must_change_password'))) {
      await db.schema.alterTable('system_users', (table) => {
        table.boolean('must_change_password').notNullable().defaultTo(false);
      });
    }

    if (hasSystemUsers && !(await db.schema.hasColumn('system_users', 'email'))) {
      await db.schema.alterTable('system_users', (table) => {
        table.string('email', 191).notNullable().defaultTo('');
      });
    }

    const hasApiTokens = await db.schema.hasTable('api_tokens');
    if (hasApiTokens && !(await db.schema.hasColumn('api_tokens', 'expires_at'))) {
      await db.schema.alterTable('api_tokens', (table) => {
        table.dateTime('expires_at').nullable();
      });
    }

    const hasTransactions = await db.schema.hasTable('transactions');
    if (hasTransactions && !(await db.schema.hasColumn('transactions', 'bay_code'))) {
      await db.schema.alterTable('transactions', (table) => {
        table.string('bay_code', 16).nullable();
      });
    }
  }

  static async bootstrapDefaultAccounts() {
    await this.ensureSchema();

    let seedAccounts: SeedSystemAccount[];
    try {
      seedAccounts = getDefaultSystemAccounts();
    } catch (err) {
      console.error('❌ Cannot seed default accounts — missing env vars:', err);
      return;
    }

    for (const account of seedAccounts) {
      try {
        const existing = await db<SystemUserRow>('system_users').where('username', account.username).first();

        if (existing) {
          if (!existing.email || !String(existing.email).trim()) {
            const nextEmail = account.role === 'agency'
              ? await resolveAgencyEmail(account.agencyId)
              : (isValidEmail(account.username) ? account.username.toLowerCase() : buildFallbackEmailFromUsername(account.username));

            if (nextEmail) {
              await db('system_users')
                .where('id', existing.id)
                .update({
                  email: nextEmail,
                  updated_at: db.fn.now(),
                });
            }
          }

          if (account.role === 'agency' && account.agencyId && existing.agency_id !== account.agencyId) {
            await db('system_users')
              .where('id', existing.id)
              .update({
                agency_id: account.agencyId,
                full_name: account.fullName,
                updated_at: db.fn.now()
              });
          }
          console.log(`ℹ️  Account already exists: ${account.username}`);
          continue;
        }

        const passwordHash = await bcrypt.hash(account.password, 10);

        await db('system_users').insert({
          username: account.username,
          password_hash: passwordHash,
          full_name: account.fullName,
          email: isValidEmail(account.username) ? account.username.toLowerCase() : buildFallbackEmailFromUsername(account.username),
          role: account.role,
          agency_id: account.agencyId,
          is_active: 1,
          must_change_password: 0
        });
        console.log(`✅ Default account created: ${account.username} (${account.role})`);
      } catch (err) {
        console.error(`❌ Failed to seed account "${account.username}":`, err);
      }
    }
  }

  static async login(username: string, password: string) {
    const user = await db<SystemUserRow>('system_users')
      .where('username', username)
      .andWhere('is_active', 1)
      .first();

    if (!user) {
      throw new Error('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Sai mật khẩu');
    }

    // Enforce password change when user is explicitly flagged
    // or is still using the system default initial password.
    const isUsingDefaultPassword = await bcrypt.compare(getDefaultInitialPassword(), user.password_hash);
    const mustChangePassword = Boolean(user.must_change_password) || isUsingDefaultPassword;

    await db('system_users').where('id', user.id).update({
      last_login_at: db.fn.now(),
      ...(mustChangePassword ? { must_change_password: true } : {}),
      updated_at: db.fn.now()
    });

    const authUser = {
      ...sanitizeUser(user),
      mustChangePassword
    };
    const token = jwt.sign(authUser, getJwtSecret() as jwt.Secret, {
      expiresIn: getJwtExpiresIn() as jwt.SignOptions['expiresIn']
    });

    return { token, user: authUser };
  }

  static async getById(id: number): Promise<AuthUser | null> {
    const user = await db<SystemUserRow>('system_users').where('id', id).first();
    if (!user) return null;
    return sanitizeUser(user);
  }

  static async listUsers(params: { page?: number; limit?: number; includeTotal?: boolean } = {}) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const offset = (page - 1) * limit;

    const query = db<SystemUserRow>('system_users')
      .select('id', 'username', 'full_name', 'email', 'role', 'agency_id', 'is_active', 'last_login_at', 'created_at')
      .orderByRaw("FIELD(role, 'sa', 'engineer', 'agency')")
      .orderBy('id', 'asc');

    const users = await query.clone().limit(limit).offset(offset);

    let total = undefined;
    if (params.includeTotal) {
      const countRes = await db('system_users').count('id as count').first();
      total = Number(countRes?.count || 0);
    }

    return {
      data: users.map((user) => ({
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email || null,
        role: user.role,
        agencyId: user.agency_id,
        isActive: Boolean(user.is_active),
        lastLoginAt: user.last_login_at || null,
        createdAt: (user as any)!.created_at || null
      })),
      total
    };
  }

  static async createUser(data: {
    username: string;
    password: string;
    fullName: string;
    role: UserRole;
    agencyId?: number | null;
    email?: string | null;
  }) {
    const existing = await db('system_users').where('username', data.username).first();
    if (existing) throw new Error('Tên đăng nhập đã tồn tại');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const nextEmail = normalizeOptionalEmail(data.email);

    if (!nextEmail) {
      throw new Error('Email account là bắt buộc và phải đúng định dạng');
    }
    const [id] = await db('system_users').insert({
      username: data.username,
      password_hash: passwordHash,
      full_name: data.fullName,
      email: nextEmail,
      role: data.role,
      agency_id: data.agencyId || null,
      is_active: true,
      must_change_password: true
    });

    const user = await db<SystemUserRow>('system_users')
      .where('id', id)
      .select('id', 'username', 'full_name', 'email', 'role', 'agency_id', 'is_active', 'last_login_at', 'created_at')
      .first();

    return {
      id: user!.id,
      username: user!.username,
      fullName: user!.full_name,
      email: user!.email || null,
      role: user!.role,
      agencyId: user!.agency_id,
      isActive: Boolean(user!.is_active),
      mustChangePassword: Boolean((user as any)!.must_change_password),
      lastLoginAt: null,
      createdAt: (user as any)!.created_at || null
    };
  }

  static async updateUser(id: number, data: {
    fullName?: string;
    role?: UserRole;
    agencyId?: number | null;
    email?: string | null;
    isActive?: boolean;
  }) {
    const user = await db('system_users').where('id', id).first();
    if (!user) throw new Error('Không tìm thấy tài khoản');

    const updates: Record<string, any> = {};
    if (data.fullName !== undefined) updates.full_name = data.fullName;
    if (data.role !== undefined) updates.role = data.role;
    if ('agencyId' in data) updates.agency_id = data.agencyId ?? null;
    if (data.isActive !== undefined) updates.is_active = data.isActive;
    if ('email' in data) {
      updates.email = normalizeOptionalEmail(data.email);
      if (!updates.email) {
        throw new Error('Email account là bắt buộc và phải đúng định dạng');
      }
    }

    if (Object.keys(updates).length === 0) throw new Error('Không có dữ liệu cần cập nhật');
    updates.updated_at = db.fn.now();

    await db('system_users').where('id', id).update(updates);
  }

  static async deleteUser(id: number, requesterId: number) {
    const user = await db('system_users').where('id', id).first();
    if (!user) throw new Error('Không tìm thấy tài khoản');
    if (user.username === 'sa') throw new Error('Không thể xóa tài khoản superadmin');
    if (id === requesterId) throw new Error('Không thể xóa tài khoản đang đăng nhập');

    await db('system_users').where('id', id).delete();
  }

  static async resetPassword(id: number, newPassword: string) {
    const user = await db('system_users').where('id', id).first();
    if (!user) throw new Error('Không tìm thấy tài khoản');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db('system_users').where('id', id).update({
      password_hash: passwordHash,
      must_change_password: true,
      updated_at: db.fn.now()
    });
  }

  static async changeOwnPassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await db<SystemUserRow>('system_users').where('id', userId).first();
    if (!user) throw new Error('Không tìm thấy tài khoản');

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new Error('Mật khẩu hiện tại không đúng');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db('system_users').where('id', userId).update({
      password_hash: passwordHash,
      must_change_password: false,
      updated_at: db.fn.now()
    });
  }

  static async updateProfile(userId: number, data: { fullName?: string; avatar?: string | null }) {
    const user = await db<SystemUserRow>('system_users').where('id', userId).first();
    if (!user) throw new Error('Không tìm thấy tài khoản');

    const updates: Record<string, any> = { updated_at: db.fn.now() };
    if (data.fullName !== undefined) updates.full_name = data.fullName;
    if ('avatar' in data) updates.avatar = data.avatar ?? null;

    await db('system_users').where('id', userId).update(updates);

    const updated = await db<SystemUserRow>('system_users').where('id', userId).first();
    return sanitizeUser(updated!);
  }

  static async requestPasswordReset(username: string) {
    const normalizedUsername = String(username || '').trim();
    if (!normalizedUsername) {
      return { resetToken: null };
    }

    const user = await db<SystemUserRow>('system_users')
      .where('username', normalizedUsername)
      .andWhere('is_active', 1)
      .first();

    if (!user) {
      return { resetToken: null };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + config.auth.passwordResetTokenTtlMinutes * 60 * 1000);
    const recipientEmail = await resolveResetRecipientEmail(user);

    await db.transaction(async (trx) => {
      await trx('password_reset_tokens')
        .where('user_id', user.id)
        .whereNull('used_at')
        .update({ used_at: trx.fn.now() });

      await trx('password_reset_tokens').insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used_at: null,
        created_at: trx.fn.now(),
      });
    });

    let emailSent = false;
    if (recipientEmail) {
      const resetBase = String(config.auth.passwordResetUrlBase || '').replace(/\/$/, '');
      const resetUrl = `${resetBase}/${encodeURIComponent(rawToken)}`;
      emailSent = await emailService.sendPasswordResetEmail({
        to: recipientEmail,
        fullName: user.full_name,
        resetUrl,
        expiresInMinutes: config.auth.passwordResetTokenTtlMinutes,
      });
    }

    if (config.nodeEnv !== 'production') {
      return { resetToken: rawToken, emailSent };
    }

    return { resetToken: null, emailSent };
  }

  static async isPasswordResetTokenValid(token: string): Promise<boolean> {
    const normalizedToken = String(token || '').trim();
    if (!normalizedToken) {
      return false;
    }

    const tokenHash = crypto.createHash('sha256').update(normalizedToken).digest('hex');
    const row = await db<PasswordResetTokenRow>('password_reset_tokens')
      .where('token_hash', tokenHash)
      .whereNull('used_at')
      .andWhere('expires_at', '>', db.fn.now())
      .first();

    return Boolean(row);
  }

  static async resetPasswordByToken(token: string, newPassword: string) {
    const normalizedToken = String(token || '').trim();
    const normalizedPassword = String(newPassword || '');

    if (!normalizedToken || normalizedPassword.length < 6) {
      throw new Error('Thông tin đặt lại mật khẩu không hợp lệ');
    }

    const tokenHash = crypto.createHash('sha256').update(normalizedToken).digest('hex');

    await db.transaction(async (trx) => {
      const tokenRow = await trx<PasswordResetTokenRow>('password_reset_tokens')
        .where('token_hash', tokenHash)
        .whereNull('used_at')
        .andWhere('expires_at', '>', trx.fn.now())
        .first();

      if (!tokenRow) {
        throw new Error('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
      }

      const user = await trx<SystemUserRow>('system_users')
        .where('id', tokenRow.user_id)
        .andWhere('is_active', 1)
        .first();

      if (!user) {
        throw new Error('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
      }

      const passwordHash = await bcrypt.hash(normalizedPassword, 10);

      await trx('system_users').where('id', user.id).update({
        password_hash: passwordHash,
        must_change_password: false,
        updated_at: trx.fn.now(),
      });

      await trx('password_reset_tokens').where('id', tokenRow.id).update({
        used_at: trx.fn.now(),
      });
    });
  }
}