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
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  agency_id: number | null;
  is_active: number;
  avatar?: string | null;
  last_login_at?: string | null;
  must_change_password?: number | boolean;
};

type SeedSystemAccount = {
  email: string;
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


async function resolveResetRecipientEmail(user: SystemUserRow): Promise<string> {
  const directEmail = String(user.email || '').trim().toLowerCase();
  if (isValidEmail(directEmail)) {
    return directEmail;
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
      email: getRequiredEnv('SEED_SA_EMAIL'),
      email: 'sa',
      password: getRequiredEnv('SEED_SA_PASSWORD'),
      fullName: 'Super Admin',
      role: 'sa',
      agencyId: null
    },
    {
      email: getRequiredEnv('SEED_ENGINEER_EMAIL'),
      email: 'engineer',
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
    email: user.email,
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
        table.string('email', 191).notNullable().unique();
        table.string('password_hash', 255).notNullable();
        table.string('full_name', 128).notNullable();
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
        table.string('email', 191).nullable();
      });

      // No more fallback from username as username is being removed
      await db.schema.alterTable('system_users', (table) => {
        table.string('email', 191).notNullable().unique().alter();
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

    const hasPasswordTokens = await db.schema.hasTable('password_reset_tokens');
    if (!hasPasswordTokens) {
      await db.schema.createTable('password_reset_tokens', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable().references('id').inTable('system_users').onDelete('CASCADE');
        table.string('token_hash', 255).notNullable().unique();
        table.dateTime('expires_at').notNullable();
        table.dateTime('used_at').nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
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
        const existing = await db<SystemUserRow>('system_users').where('email', account.email).first();

        if (existing) {
          if (!existing.email || !String(existing.email).trim()) {
            const nextEmail = account.role === 'agency'
              ? await resolveAgencyEmail(account.agencyId)
              : null;

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
          console.log(`ℹ️  Account already exists: ${account.email}`);
          continue;
        }

        const passwordHash = await bcrypt.hash(account.password, 10);

        await db('system_users').insert({
          email: account.email,
          password_hash: passwordHash,
          full_name: account.fullName,
          role: account.role,
          agency_id: account.agencyId,
          is_active: 1,
          must_change_password: 0
        });
        console.log(`✅ Default account created: ${account.email} (${account.role})`);
      } catch (err) {
        console.error(`❌ Failed to seed account "${account.email}":`, err);
      }
    }
  }

  static async login(email: string, password: string) {
    const user = await db<SystemUserRow>('system_users')
      .where('email', email)
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

  static async listUsers(params: { page?: number; limit?: number; includeTotal?: boolean; keyword?: string } = {}) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const offset = (page - 1) * limit;
    const keyword = params.keyword ? String(params.keyword).trim() : '';

    const query = db<SystemUserRow>('system_users')
      .select('id', 'email', 'full_name', 'role', 'agency_id', 'is_active', 'last_login_at', 'created_at');

    if (keyword) {
      query.where((builder) => {
        builder.where('email', 'like', `%${keyword}%`)
               .orWhere('full_name', 'like', `%${keyword}%`);
      });
    }

    query.orderByRaw("FIELD(role, 'sa', 'engineer', 'agency')")
      .orderBy('id', 'asc');

    const users = await query.clone().limit(limit).offset(offset);

    let total = undefined;
    if (params.includeTotal) {
      const countQuery = db('system_users');
      if (keyword) {
        countQuery.where((builder) => {
          builder.where('email', 'like', `%${keyword}%`)
                 .orWhere('full_name', 'like', `%${keyword}%`);
        });
      }
      const countRes = await countQuery.count('id as count').first();
      total = Number(countRes?.count || 0);
    }

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
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
    email: string;
    password?: string;
    fullName: string;
    role: UserRole;
    agencyId?: number | null;
  }) {
    const email = data.email.trim().toLowerCase();
    if (!email) {
      throw new Error('Email account là bắt buộc và phải đúng định dạng');
    }

    const existing = await db('system_users').where('email', email).first();
    if (existing) throw new Error('Email này đã được sử dụng');
    const passwordHash = data.password
      ? await bcrypt.hash(data.password, 10)
      : await bcrypt.hash(getDefaultInitialPassword(), 10);

    const [id] = await db('system_users').insert({
      email,
      password_hash: passwordHash,
      full_name: data.fullName,
      role: data.role,
      agency_id: data.agencyId || null,
      is_active: 1,
      must_change_password: data.password ? 0 : 1
    });

    const user = await db<SystemUserRow>('system_users')
      .where('id', id)
      .select('id', 'email', 'full_name', 'role', 'agency_id', 'is_active', 'last_login_at', 'created_at', 'must_change_password')
      .first();

    return {
      id: user!.id,
      email: user!.email,
      email: user!.username || user!.email.split('@')[0],
      fullName: user!.full_name,
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
      const nextEmail = normalizeOptionalEmail(data.email);
      if (!nextEmail) {
        throw new Error('Email account là bắt buộc và phải đúng định dạng');
      }
      // Check if email already used by someone else
      const duplicate = await db('system_users').where('email', nextEmail).andWhereNot('id', id).first();
      if (duplicate) throw new Error('Email này đã được sử dụng bởi một tài khoản khác');
      updates.email = nextEmail;
    }

    if (Object.keys(updates).length === 0) throw new Error('Không có dữ liệu cần cập nhật');
    updates.updated_at = db.fn.now();

    await db('system_users').where('id', id).update(updates);
  }

  static async deleteUser(id: number, requesterId: number) {
    const user = await db('system_users').where('id', id).first();
    if (!user) throw new Error('Không tìm thấy tài khoản');
    if (user.email === 'admin@system.local' || user.role === 'sa') throw new Error('Không thể xóa tài khoản superadmin');
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

  static async requestPasswordReset(email: string) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return { resetToken: null };
    }

    const user = await db<SystemUserRow>('system_users')
      .where('email', normalizedEmail)
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
