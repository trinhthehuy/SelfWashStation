// feedback.service.ts
import db from '../db/index.js';

export class FeedbackService {
  /**
   * Lấy danh sách góp ý
   * - sa/engineer: thấy tất cả, kèm tên đại lý
   * - agency: chỉ thấy của đại lý mình
   */
  async getFeedbacks(scopedAgencyId?: number | null) {
    const query = db('feedback as f')
      .select(
        'f.*',
        'a.agency_name',
      )
      .leftJoin('agency as a', 'f.agency_id', 'a.id')
      .orderBy('f.created_at', 'desc');

    if (scopedAgencyId) {
      query.where('f.agency_id', scopedAgencyId);
    }

    return await query;
  }

  /**
   * Đại lý tạo góp ý mới
   */
  async createFeedback(data: { title: string; content: string }, agencyId: number) {
    const [newId] = await db('feedback').insert({
      agency_id: agencyId,
      title: data.title,
      content: data.content,
      status: 'pending',
    });
    return await db('feedback').where('id', newId).first();
  }

  /**
   * SA/Engineer phản hồi góp ý
   */
  async replyFeedback(id: number, reply: string, repliedBy: string) {
    const feedback = await db('feedback').where('id', id).first();
    if (!feedback) {
      throw new Error('Không tìm thấy góp ý');
    }

    await db('feedback').where('id', id).update({
      reply,
      replied_by: repliedBy,
      replied_at: db.fn.now(),
      status: 'replied',
      is_read_by_agency: 0, // reset về chưa đọc khi có reply mới
      updated_at: db.fn.now(),
    });

    return await db('feedback').where('id', id).first();
  }

  /**
   * Agency đánh dấu đã đọc phản hồi
   */
  async markReadByAgency(id: number, scopedAgencyId: number) {
    const feedback = await db('feedback')
      .where('id', id)
      .andWhere('agency_id', scopedAgencyId)
      .first();
    if (!feedback) {
      throw new Error('Không tìm thấy góp ý');
    }
    await db('feedback').where('id', id).update({
      is_read_by_agency: 1,
      updated_at: db.fn.now(),
    });
  }

  /**
   * Đếm số lượng cần chú ý (dùng cho notification bell badge)
   * - sa/engineer: đếm góp ý status='pending' chưa trả lời
   * - agency: đếm reply mới chưa đọc (status='replied' & is_read_by_agency=0)
   */
  async getUnreadCount(role: string, scopedAgencyId?: number | null): Promise<number> {
    if (role === 'agency' && scopedAgencyId) {
      const result = await db('feedback')
        .where('agency_id', scopedAgencyId)
        .andWhere('status', 'replied')
        .andWhere('is_read_by_agency', 0)
        .count('id as count')
        .first();
      return Number(result?.count ?? 0);
    }

    // sa / engineer: đếm số góp ý chờ phản hồi
    const result = await db('feedback')
      .where('status', 'pending')
      .count('id as count')
      .first();
    return Number(result?.count ?? 0);
  }
}
