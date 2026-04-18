// feedback.service.ts
import db from '../db/index.js';
import { AppError } from '../middleware/error-handler.js';
import type { UserRole } from '../middleware/auth.js';

export class FeedbackService {
  /**
   * Lấy danh sách góp ý
   * - sa: thấy tất cả
   * - role khác: chỉ thấy góp ý do chính mình tạo
   */
  async getFeedbacks(role: UserRole, userId: number) {
    const query = db('feedback as f')
      .select(
        'f.*',
        'a.agency_name',
        'u.full_name as creator_name',
      )
      .leftJoin('agency as a', 'f.agency_id', 'a.id')
      .leftJoin('system_users as u', 'f.creator_user_id', 'u.id')
      .orderBy('f.created_at', 'desc');

    if (role !== 'sa') {
      query.where('f.creator_user_id', userId);
    }

    return await query;
  }

  async getFeedbackById(id: number) {
    return await db('feedback as f')
      .select('f.*', 'a.agency_name', 'u.full_name as creator_name')
      .leftJoin('agency as a', 'f.agency_id', 'a.id')
      .leftJoin('system_users as u', 'f.creator_user_id', 'u.id')
      .where('f.id', id)
      .first();
  }

  /**
   * Người dùng tạo góp ý mới
   */
  async createFeedback(data: { title: string; content: string }, creator: { userId: number; role: UserRole; agencyId?: number | null }) {
    const [newId] = await db('feedback').insert({
      agency_id: creator.agencyId ?? null,
      creator_user_id: creator.userId,
      creator_role: creator.role,
      title: data.title,
      content: data.content,
      status: 'pending',
      is_read_by_creator: 1,
    });
    return await db('feedback').where('id', newId).first();
  }

  /**
   * SA phản hồi góp ý
   */
  async replyFeedback(id: number, reply: string, repliedBy: string) {
    const feedback = await db('feedback').where('id', id).first();
    if (!feedback) {
      throw new AppError('Không tìm thấy góp ý', 404);
    }

    await db('feedback').where('id', id).update({
      reply,
      replied_by: repliedBy,
      replied_at: db.fn.now(),
      status: 'replied',
      is_read_by_creator: 0,
      is_read_by_agency: 0,
      updated_at: db.fn.now(),
    });

    return await db('feedback').where('id', id).first();
  }

  /**
   * Creator đánh dấu đã đọc phản hồi
   */
  async markReadByCreator(id: number, creatorUserId: number) {
    const feedback = await db('feedback')
      .where('id', id)
      .andWhere('creator_user_id', creatorUserId)
      .first();
    if (!feedback) {
      throw new AppError('Không tìm thấy góp ý', 404);
    }
    await db('feedback').where('id', id).update({
      is_read_by_creator: 1,
      is_read_by_agency: 1,
      updated_at: db.fn.now(),
    });
  }
}
