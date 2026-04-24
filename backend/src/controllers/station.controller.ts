// station.controller.ts
import { Response, NextFunction } from 'express';
import { getRequestScope, type AuthRequest } from '../middleware/auth.js';
import { StationService } from '../services/station.service.js';
import { auditService } from '../services/audit.service.js';

// Khởi tạo instance của Service để dùng chung trong Class
const stationService = new StationService();

export class StationController {
  /**
   * Lấy tất cả các trạm
   */
  async getAllStations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, province_id, ward_id, agency_id, station_id } = req.query;
      const hasPagination = page !== undefined || limit !== undefined;

      const filters = {
        provinceId: province_id ? Number(province_id) : undefined,
        wardId: ward_id ? Number(ward_id) : undefined,
        agencyId: agency_id ? Number(agency_id) : undefined,
        stationId: station_id ? Number(station_id) : undefined
      };

      if (hasPagination) {
        const pageNumber = page ? Number(page) : 1;
        const limitNumber = limit ? Number(limit) : 20;
        const paged = await stationService.getAllStationsPaginated(
          pageNumber,
          limitNumber,
          getRequestScope(req),
          filters
        );

        res.json({
          data: paged.data,
          total: paged.total,
          page: paged.page,
          limit: paged.limit,
          total_pages: paged.totalPages
        });
        return;
      }

      const stations = await stationService.getAllStations(getRequestScope(req), filters);
      res.json(stations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy danh sách trạm có lọc theo Tỉnh hoặc Đại lý (dùng cho dropdown filter)
   */
  async getStationsByFilters(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // 1. Lấy thêm ward_id, keyword, limit từ query string
    const { province_id, ward_id, agency_id, keyword, limit } = req.query;
    
    // 2. Ép kiểu sang số (number)
    const pId = province_id ? Number(province_id) : undefined;
    const wId = ward_id ? Number(ward_id) : undefined;
    const aId = agency_id ? Number(agency_id) : undefined;
    const searchKeyword = keyword ? String(keyword) : undefined;
    const limitNumber = limit ? Number(limit) : 20; // Mặc định 20 nếu dùng cho remote search

    // 3. Gọi hàm service với tham số mới
    const stations = await stationService.getStationsByFilters(
      pId, 
      wId, 
      aId, 
      getRequestScope(req),
      searchKeyword,
      limitNumber
    );

    // 4. Trả về kết quả
    res.json({
      success: true,
      data: stations
    });
  } catch (error) {
    next(error);
  }
}
  /**
   * API lấy mã trạm tự động tiếp theo
   * URL: GET /api/stations/generate-code?provinceCode=NB
   */
  async getNextStationCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Lấy provinceCode từ Query String
      const provinceCode = req.query.provinceCode as string;

      // Kiểm tra tính hợp lệ (Validation)
      if (!provinceCode) {
        return res.status(400).json({ 
          message: "Thiếu mã tỉnh (provinceCode)" 
        });
      }

      // Điều phối sang Service xử lý logic
      const nextCode = await stationService.generateNextStationCode(provinceCode);
      // Phản hồi kết quả cho Frontend
      return res.json({ nextCode });
    } catch (error: any) {
      console.error("Error in getNextCode:", error);
      
      // Chuyển lỗi sang Middleware xử lý lỗi tập trung hoặc trả về 500
      return res.status(500).json({
        message: "Lỗi hệ thống khi tạo mã trạm",
        error: error.message
      });
    }
  }
  //import trạm mới vào database
  async createStation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const newStation = await stationService.createStation(req.body, getRequestScope(req));
      auditService.log({
        userId: req.user?.id,
        email: req.user?.email || 'system',
        role: req.user?.role || 'unknown',
        action: 'STATION_CREATE',
        entityType: 'station',
        entityId: newStation.id,
        entityName: newStation.station_name,
        ip: req.ip,
      });
      res.status(201).json({
        message: "Tạo trạm thành công",
        data: newStation
      });
    } catch (error) {
      next(error);
    }
  }

  //update trạm vào database
  async update(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    const updatedStation = await stationService.updateStation(Number(id), data, getRequestScope(req));

    if (!updatedStation) {
      return res.status(404).json({ message: 'Không tìm thấy trạm cần sửa' });
    }

    auditService.log({
      userId: req.user?.id,
      email: req.user?.email || 'system',
      role: req.user?.role || 'unknown',
      action: 'STATION_UPDATE',
      entityType: 'station',
      entityId: Number(id),
      entityName: updatedStation.station_name,
      ip: req.ip,
    });

    return res.status(200).json(updatedStation);
  } catch (error: any) {
    console.error("Lỗi Controller Update:", error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật trạm' });
  }
}

  async deleteStation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const deletedStation = await stationService.deleteStation(Number(id), getRequestScope(req));
    auditService.log({
      userId: req.user?.id,
      email: req.user?.email || 'system',
      role: req.user?.role || 'unknown',
      action: 'STATION_DELETE',
      entityType: 'station',
      entityId: Number(id),
      entityName: deletedStation.station_name,
      ip: req.ip,
    });
    res.status(200).json({
      message: "Xóa trạm thành công",
      data: { id: Number(id) }
    });
  } catch (error) {
    next(error);
  }
}

  /**
   * Gán chiến lược cho nhiều trạm (sa, engineer, agency đều dùng được)
   */
  async assignStrategy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { station_ids, strategy_id } = req.body;

      if (!Array.isArray(station_ids) || station_ids.length === 0) {
        return res.status(400).json({ message: 'Danh sách trạm không hợp lệ' });
      }

      const affected = await stationService.assignStrategy(
        station_ids.map(Number),
        strategy_id != null ? Number(strategy_id) : null,
        getRequestScope(req)
      );

      return res.json({
        message: `Đã cập nhật chiến lược cho ${affected} trạm`,
        affected
      });
    } catch (error) {
      next(error);
    }
  }
}
