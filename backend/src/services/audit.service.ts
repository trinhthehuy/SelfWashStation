// audit.service.ts
import db from '../db/index.js';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'USER_RESET_PASSWORD'
  | 'AGENCY_CREATE'
  | 'AGENCY_UPDATE'
  | 'AGENCY_DELETE'
  | 'STATION_CREATE'
  | 'STATION_UPDATE'
  | 'STATION_DELETE'
  | 'STRATEGY_CREATE'
  | 'STRATEGY_UPDATE'
  | 'STRATEGY_DELETE'
  | 'BAY_CREATE'
  | 'BAY_UPDATE'
  | 'BAY_DELETE'
  | 'USER_SCOPE_UPDATE';

export interface AuditLogParams {
  userId?: number | null;
  username: string;
  role: string;
  action: AuditAction;
  entityType?: string;
  entityId?: number | null;
  entityName?: string;
  details?: Record<string, any>;
  ip?: string;
}

function buildDefaultDetails(params: AuditLogParams): Record<string, any> | null {
  const fallback: Record<string, any> = {};

  if (params.action === 'LOGIN_SUCCESS') {
    fallback.message = 'Đăng nhập thành công';
  }

  if (params.action === 'LOGIN_FAILED') {
    fallback.message = 'Đăng nhập thất bại';
  }

  if (params.entityType) {
    fallback.entityType = params.entityType;
  }

  if (params.entityName) {
    fallback.targetName = params.entityName;
  }

  if (params.entityId != null) {
    fallback.targetId = params.entityId;
  }

  return Object.keys(fallback).length > 0 ? fallback : null;
}

class AuditLogService {
  /**
   * Ghi một dòng audit log.
   * Lỗi được xử lý im lặng để không ảnh hưởng luồng chính.
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      const details = params.details && Object.keys(params.details).length > 0
        ? params.details
        : buildDefaultDetails(params);

      await db('audit_logs').insert({
        user_id: params.userId ?? null,
        username: params.username,
        role: params.role,
        action: params.action,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        entity_name: params.entityName ?? null,
        details: details ? JSON.stringify(details) : null,
        ip_address: params.ip ?? null,
        created_at: db.fn.now(),
      });
    } catch (error) {
      console.error('[AuditLog] Failed to write log:', error);
    }
  }

  /**
   * Lấy danh sách audit logs có phân trang và lọc.
   */
  async getLogs(filters: {
    page?: number;
    limit?: number;
    userId?: number;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 50, userId, action, entityType, startDate, endDate } = filters;
    const offset = (Number(page) - 1) * Number(limit);

    const query = db('audit_logs').orderBy('created_at', 'desc');

    if (userId) query.where('user_id', userId);
    if (action && action !== '') query.where('action', action);
    if (entityType && entityType !== '') query.where('entity_type', entityType);
    if (startDate && endDate) {
      query.whereBetween('created_at', [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);
    } else if (startDate) {
      query.where('created_at', '>=', `${startDate} 00:00:00`);
    }

    const [data, countResult] = await Promise.all([
      query.clone().select('*').limit(Number(limit)).offset(offset),
      query.clone().count('id as total').first(),
    ]);

    return {
      data,
      total: Number(countResult?.total || 0),
      page: Number(page),
      limit: Number(limit),
    };
  }
}

export const auditService = new AuditLogService();
