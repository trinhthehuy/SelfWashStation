// ward.controller.ts
import { Request, Response, NextFunction } from 'express';
import { WardService } from '../services/ward.service.js';

const wardService = new WardService();

export class WardController {
  async getProvinces(req: Request, res: Response, next: NextFunction) {
    try {
      const provinces = await wardService.getProvinces();
      res.json({ success: true, data: provinces });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Lấy danh sách huyện (có thể lọc theo province_id từ query string)
   * URL ví dụ: /wards?province_id=1
   */
  async getWards(req: Request, res: Response, next: NextFunction) {
    try {
      // Lấy province_id từ query params
      const { province_id } = req.query;    //province_id phải trùng với tên mà client gửi lên, nếu client gửi là provinceId thì phải là req.query.provinceId
      // Gọi service xử lý logic
      const wards = await wardService.getWardsByProvince(province_id as string);
      // Trả về dữ liệu dưới dạng object { data: [...] } để khớp với frontend của bạn
      res.json({
        success: true,
        data: wards
      });
    } catch (error) {
      // Chuyển lỗi sang middleware xử lý lỗi tập trung
      next(error);
    }
  }
}