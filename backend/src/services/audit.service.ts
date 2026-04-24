// audit.service.ts
import db from '../db/index.js';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_SUCCESS'
  | 'PASSWORD_RESET_FAILED'
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
  | 'USER_SCOPE_UPDATE'
  | 'FEEDBACK_CREATE'
  | 'FEEDBACK_REPLY';

export interface AuditLogParams {
  userId?: number | null;
  email: string;
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
  private logQueue: any[] = [];
  private isProcessing = false;
  private workerTimer: NodeJS.Timeout | null = null;
  private readonly MAX_BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 5000; // 5 giây

  constructor() {
    // Tự động khởi động worker khi service được khởi tạo
    this.startWorker();
  }

  /**
   * Khởi động worker ngầm để xử lý hàng đợi
   */
  private startWorker() {
    if (this.workerTimer) return;
    this.workerTimer = setInterval(() => this.processQueue(), this.FLUSH_INTERVAL);
  }

  /**
   * Xử lý lưu log từ hàng đợi vào Database theo Batch
   */
  private async processQueue() {
    if (this.isProcessing || this.logQueue.length === 0) return;

    this.isProcessing = true;
    const batch = this.logQueue.splice(0, this.MAX_BATCH_SIZE);

    try {
      await db('audit_logs').insert(batch);
      // console.log(`[AuditLog] Successfully flushed ${batch.length} logs.`);
    } catch (error) {
      console.error('[AuditLog] Failed to flush logs batch:', error);
      // Nếu lỗi, có thể cân nhắc đẩy ngược lại hàng đợi hoặc lưu vào file backup
    } finally {
      this.isProcessing = false;
      
      // Nếu hàng đợi vẫn còn nhiều, tiếp tục xử lý ngay lập tức
      if (this.logQueue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  /**
   * Ghi một dòng audit log (Xử lý Background).
   * Phương thức này giờ đây trả về ngay lập tức để không chặn luồng chính.
   */
  log(params: AuditLogParams): void {
    try {
      const details = params.details && Object.keys(params.details).length > 0
        ? params.details
        : buildDefaultDetails(params);

      const logEntry = {
        user_id: params.userId ?? null,
        email: params.email || 'unknown',
        role: params.role,
        action: params.action,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        entity_name: params.entityName ?? null,
        details: details ? JSON.stringify(details) : null,
        ip_address: params.ip ?? null,
        created_at: new Date(), // Sử dụng thời gian JS để đảm bảo chính xác thứ tự
      };

      this.logQueue.push(logEntry);

      // Nếu hàng đợi quá lớn, xử lý ngay không đợi interval
      if (this.logQueue.length >= this.MAX_BATCH_SIZE) {
        setImmediate(() => this.processQueue());
      }
    } catch (error) {
      console.error('[AuditLog] Error adding to queue:', error);
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
    includeTotal?: boolean;
  }) {
    const { 
      page = 1, 
      limit = 50, 
      userId, 
      action, 
      entityType, 
      startDate, 
      endDate,
      includeTotal = true 
    } = filters;
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

    const dataPromise = query.clone()
      .select('*')
      .select('email as username') // Alias for frontend compatibility
      .limit(Number(limit))
      .offset(offset);
    let totalPromise = null;
    if (includeTotal) {
      totalPromise = query.clone().count('id as total').first();
    }

    const [data, countResult] = await Promise.all([
      dataPromise,
      totalPromise,
    ]);

    return {
      data,
      ...(includeTotal ? { total: Number(countResult?.total || 0) } : {}),
      page: Number(page),
      limit: Number(limit),
    };
  }
}

export const auditService = new AuditLogService();
