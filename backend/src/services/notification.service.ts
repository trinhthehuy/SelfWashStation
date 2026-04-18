import db from '../db/index.js';

export type NotificationType = 'FEEDBACK_NEW' | 'FEEDBACK_REPLIED' | 'SYSTEM_ALERT';

export class NotificationService {
  async listForUser(
    userId: number,
    options: { status?: 'all' | 'read' | 'unread'; type?: NotificationType; page?: number; limit?: number }
  ) {
    const page = Number(options.page ?? 1);
    const limit = Number(options.limit ?? 20);
    const offset = (page - 1) * limit;

    const query = db('notifications')
      .where('recipient_user_id', userId)
      .andWhere('is_archived', 0)
      .orderBy('created_at', 'desc');

    if (options.status === 'read') query.andWhere('is_read', 1);
    if (options.status === 'unread') query.andWhere('is_read', 0);
    if (options.type) query.andWhere('type', options.type);

    const [data, countResult] = await Promise.all([
      query.clone().select('*').offset(offset).limit(limit),
      query.clone().count('id as total').first(),
    ]);

    return {
      data,
      total: Number(countResult?.total ?? 0),
      page,
      limit,
    };
  }

  async getUnreadCount(userId: number): Promise<number> {
    const result = await db('notifications')
      .where('recipient_user_id', userId)
      .andWhere('is_archived', 0)
      .andWhere('is_read', 0)
      .count('id as count')
      .first();

    return Number(result?.count ?? 0);
  }

  async markRead(id: number, userId: number) {
    const existing = await db('notifications')
      .where('id', id)
      .andWhere('recipient_user_id', userId)
      .andWhere('is_archived', 0)
      .first();

    if (!existing) {
      return null;
    }

    if (!existing.is_read) {
      await db('notifications').where('id', id).update({
        is_read: 1,
        read_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
    }

    return await db('notifications').where('id', id).first();
  }

  async markAllRead(userId: number, type?: NotificationType) {
    const query = db('notifications')
      .where('recipient_user_id', userId)
      .andWhere('is_archived', 0)
      .andWhere('is_read', 0);

    if (type) query.andWhere('type', type);

    return await query.update({
      is_read: 1,
      read_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
  }

  async createForUsers(input: {
    recipientUserIds: number[];
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string | null;
    relatedFeedbackId?: number | null;
  }) {
    const recipientUserIds = [...new Set(input.recipientUserIds)].filter(Boolean);
    if (!recipientUserIds.length) return;

    const rows = recipientUserIds.map((userId) => ({
      recipient_user_id: userId,
      type: input.type,
      title: input.title,
      message: input.message,
      action_url: input.actionUrl ?? null,
      related_feedback_id: input.relatedFeedbackId ?? null,
      is_read: 0,
      read_at: null,
      is_archived: 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    }));

    await db('notifications').insert(rows);
  }
}
