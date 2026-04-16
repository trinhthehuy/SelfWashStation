import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import type { AuthUser, UserRole } from '../middleware/auth.js';

const getJwtSecret = () => process.env.JWT_SECRET || 'fallback_secret';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

type SystemUserRow = {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  agency_id: number | null;
  is_active: number;
  avatar?: string | null;
  last_login_at?: string | null;
};

type SeedSystemAccount = {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  agencyId: number | null;
};

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
    avatar: user.avatar ?? null
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
        table.enu('role', ['sa', 'engineer', 'agency']).notNullable();
        table.integer('agency_id').unsigned().nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.timestamp('last_login_at').nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
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

    const seedAccounts = getDefaultSystemAccounts();

    for (const account of seedAccounts) {
      const existing = await db<SystemUserRow>('system_users').where('username', account.username).first();

      if (existing) {
        if (account.role === 'agency' && account.agencyId && existing.agency_id !== account.agencyId) {
          await db('system_users')
            .where('id', existing.id)
            .update({
              agency_id: account.agencyId,
              full_name: account.fullName,
              updated_at: db.fn.now()
            });
        }
        continue;
      }

      const passwordHash = await bcrypt.hash(account.password, 10);

      await db('system_users').insert({
        username: account.username,
        password_hash: passwordHash,
        full_name: account.fullName,
        role: account.role,
        agency_id: account.agencyId,
        is_active: 1
      });
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

    await db('system_users').where('id', user.id).update({
      last_login_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const authUser = sanitizeUser(user);
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

  static async listUsers() {
    const users = await db<SystemUserRow>('system_users')
      .select('id', 'username', 'full_name', 'role', 'agency_id', 'is_active', 'last_login_at', 'created_at')
      .orderByRaw("FIELD(role, 'sa', 'engineer', 'agency')")
      .orderBy('id', 'asc');

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      agencyId: user.agency_id,
      isActive: Boolean(user.is_active),
      lastLoginAt: user.last_login_at || null,
      createdAt: (user as any)!.created_at || null
    }));
  }

  static async createUser(data: {
    username: string;
    password: string;
    fullName: string;
    role: UserRole;
    agencyId?: number | null;
  }) {
    const existing = await db('system_users').where('username', data.username).first();
    if (existing) throw new Error('Tên đăng nhập đã tồn tại');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const [id] = await db('system_users').insert({
      username: data.username,
      password_hash: passwordHash,
      full_name: data.fullName,
      role: data.role,
      agency_id: data.agencyId || null,
      is_active: true
    });

    const user = await db<SystemUserRow>('system_users')
      .where('id', id)
      .select('id', 'username', 'full_name', 'role', 'agency_id', 'is_active', 'last_login_at', 'created_at')
      .first();

    return {
      id: user!.id,
      username: user!.username,
      fullName: user!.full_name,
      role: user!.role,
      agencyId: user!.agency_id,
      isActive: Boolean(user!.is_active),
      lastLoginAt: null,
      createdAt: (user as any)!.created_at || null
    };
  }

  static async updateUser(id: number, data: {
    fullName?: string;
    role?: UserRole;
    agencyId?: number | null;
    isActive?: boolean;
  }) {
    const user = await db('system_users').where('id', id).first();
    if (!user) throw new Error('Không tìm thấy tài khoản');

    const updates: Record<string, any> = {};
    if (data.fullName !== undefined) updates.full_name = data.fullName;
    if (data.role !== undefined) updates.role = data.role;
    if ('agencyId' in data) updates.agency_id = data.agencyId ?? null;
    if (data.isActive !== undefined) updates.is_active = data.isActive;

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
}