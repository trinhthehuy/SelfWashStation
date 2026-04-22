import { Router } from 'express';
import { authenticateToken, authorizeRoles, type AuthRequest } from '../middleware/auth.js';
import { loginRateLimit, registerLoginFailure, registerLoginSuccess } from '../middleware/rate-limit.js';
import config from '../config/index.js';
import { SystemAuthService } from '../services/system-auth.service.js';
import { ScopeService } from '../services/scope.service.js';
import { auditService } from '../services/audit.service.js';

const router = Router();

function isValidEmail(value: string): boolean {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: 'Vui lòng nhập tài khoản và mật khẩu' });
      return;
    }

    const session = await SystemAuthService.login(String(username), String(password));
    registerLoginSuccess(req);
    auditService.log({
      userId: session.user.id,
      username: session.user.username,
      role: session.user.role,
      action: 'LOGIN_SUCCESS',
      ip: req.ip,
    });
    res.json(session);
  } catch (error: any) {
    registerLoginFailure(req);
    auditService.log({
      userId: null,
      username: String(req.body?.username || 'unknown'),
      role: 'unknown',
      action: 'LOGIN_FAILED',
      details: { reason: error.message },
      ip: req.ip,
    });
    res.status(401).json({ message: error.message || 'Đăng nhập thất bại' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  if (!username) {
    res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập' });
    return;
  }

  try {
    const result = await SystemAuthService.requestPasswordReset(username);
    auditService.log({
      userId: null,
      username,
      role: 'unknown',
      action: 'PASSWORD_RESET_REQUEST',
      ip: req.ip,
    });

    res.json({
      message: 'Email hướng dẫn đặt lại mật khẩu đã được gửi tới email của bạn.',
      ...(config.nodeEnv !== 'production' && !result.emailSent ? { deliveryHint: 'Email chưa được gửi. Kiểm tra cấu hình SMTP trong màn Cấu hình hệ thống hoặc biến MAIL_*.' } : {}),
      ...(result.resetToken ? { resetToken: result.resetToken } : {}),
    });
  } catch (error: any) {
    auditService.log({
      userId: null,
      username,
      role: 'unknown',
      action: 'PASSWORD_RESET_FAILED',
      details: { reason: error.message },
      ip: req.ip,
    });
    res.status(500).json({ message: 'Không thể xử lý yêu cầu lúc này' });
  }
});

router.get('/reset-password/:token', async (req, res) => {
  const token = String(req.params.token || '').trim();
  const valid = await SystemAuthService.isPasswordResetTokenValid(token);
  res.json({ valid });
});

router.post('/reset-password', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.newPassword || '');

  if (!token || !newPassword) {
    res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    return;
  }

  try {
    await SystemAuthService.resetPasswordByToken(token, newPassword);
    auditService.log({
      userId: null,
      username: 'unknown',
      role: 'unknown',
      action: 'PASSWORD_RESET_SUCCESS',
      ip: req.ip,
    });
    res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error: any) {
    auditService.log({
      userId: null,
      username: 'unknown',
      role: 'unknown',
      action: 'PASSWORD_RESET_FAILED',
      details: { reason: error.message },
      ip: req.ip,
    });

    if (error.message === 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn' || error.message === 'Thông tin đặt lại mật khẩu không hợp lệ') {
      res.status(400).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: 'Đặt lại mật khẩu thất bại, vui lòng thử lại' });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const freshUser = await SystemAuthService.getById(req.user!.id);
    res.json({ user: freshUser });
  } catch (error) {
    next(error);
  }
});

router.get('/users', authenticateToken, authorizeRoles(['sa', 'engineer']), async (_req, res, next) => {
  try {
    const users = await SystemAuthService.listUsers();
    res.json({ data: users });
  } catch (error) {
    next(error);
  }
});

router.post('/users', authenticateToken, authorizeRoles(['sa', 'regional_manager']), async (req: AuthRequest, res, next) => {
  try {
    const { username, password, fullName, role, agencyId, email } = req.body;
    if (!username || !password || !fullName || !role) {
      res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
      return;
    }
    if (!String(email || '').trim()) {
      res.status(400).json({ message: 'Email account là bắt buộc' });
      return;
    }
    if (!isValidEmail(String(email || ''))) {
      res.status(400).json({ message: 'Email không hợp lệ' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
      return;
    }

    // regional_manager can only create 'agency' role users
    if (req.user!.role === 'regional_manager') {
      if (role !== 'agency') {
        res.status(403).json({ message: 'Quản lý vùng chỉ được tạo tài khoản đại lý' });
        return;
      }
      // Validate that the agency being assigned is within their province scope
      if (agencyId) {
        const { ScopeService: sc } = await import('../services/scope.service.js');
        const { default: db } = await import('../db/index.js');
        const provinceIds = await sc.getProvinceScope(req.user!.id);
        if (provinceIds.length > 0) {
          const agency = await db('agency').where('id', agencyId).first();
          if (!agency || !provinceIds.includes(agency.province_id)) {
            res.status(403).json({ message: 'Đại lý này không thuộc phạm vi tỉnh của bạn' });
            return;
          }
        }
      }
    }

    const user = await SystemAuthService.createUser({ username, password, fullName, role, agencyId, email });
    auditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      role: req.user!.role,
      action: 'USER_CREATE',
      entityType: 'system_user',
      entityId: user.id,
      entityName: username,
      details: { role, agencyId: agencyId ?? null, email: email ?? null },
      ip: req.ip,
    });
    res.status(201).json({ data: user });
  } catch (error: any) {
    if (error.message === 'Tên đăng nhập đã tồn tại') {
      res.status(409).json({ message: error.message });
      return;
    }
    next(error);
  }
});

router.put('/users/:id', authenticateToken, authorizeRoles(['sa']), async (req: AuthRequest, res, next) => {
  try {
    const { fullName, role, agencyId, email, isActive } = req.body;
    if (!String(email || '').trim()) {
      res.status(400).json({ message: 'Email account là bắt buộc' });
      return;
    }
    if (!isValidEmail(String(email || ''))) {
      res.status(400).json({ message: 'Email không hợp lệ' });
      return;
    }
    const targetUser = await SystemAuthService.getById(Number(req.params.id));
    await SystemAuthService.updateUser(Number(req.params.id), { fullName, role, agencyId, email, isActive });
    auditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      role: req.user!.role,
      action: 'USER_UPDATE',
      entityType: 'system_user',
      entityId: Number(req.params.id),
      entityName: targetUser.username,
      details: { fullName, role, agencyId, email, isActive },
      ip: req.ip,
    });
    res.json({ message: 'Cập nhật thành công' });
  } catch (error: any) {
    next(error);
  }
});

router.delete('/users/:id', authenticateToken, authorizeRoles(['sa']), async (req: AuthRequest, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const targetUser = await SystemAuthService.getById(targetId);
    await SystemAuthService.deleteUser(targetId, req.user!.id);
    auditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      role: req.user!.role,
      action: 'USER_DELETE',
      entityType: 'system_user',
      entityId: targetId,
      entityName: targetUser.username,
      ip: req.ip,
    });
    res.json({ message: 'Xóa tài khoản thành công' });
  } catch (error: any) {
    if (['Không thể xóa tài khoản superadmin', 'Không thể xóa tài khoản đang đăng nhập'].includes(error.message)) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

router.put('/users/:id/password', authenticateToken, authorizeRoles(['sa']), async (req: AuthRequest, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
      return;
    }
    const targetId = Number(req.params.id);
    const targetUser = await SystemAuthService.getById(targetId);
    await SystemAuthService.resetPassword(targetId, newPassword);
    auditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      role: req.user!.role,
      action: 'USER_RESET_PASSWORD',
      entityType: 'system_user',
      entityId: targetId,
      entityName: targetUser.username,
      ip: req.ip,
    });
    res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error: any) {
    next(error);
  }
});

router.put('/me/password', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      return;
    }
    await SystemAuthService.changeOwnPassword(req.user!.id, currentPassword, newPassword);
    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error: any) {
    if (error.message === 'Mật khẩu hiện tại không đúng') {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

router.put('/me/profile', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { fullName, avatar } = req.body;
    if (fullName !== undefined && (!fullName || String(fullName).trim().length < 2)) {
      res.status(400).json({ message: 'Họ tên không hợp lệ' });
      return;
    }
    // Giới hạn kích thước avatar (base64 ~1.37x file size, max 2MB file ≈ 2.75MB base64)
    if (avatar && Buffer.byteLength(String(avatar), 'utf8') > 3 * 1024 * 1024) {
      res.status(400).json({ message: 'Ảnh đại diện không được vượt quá 2MB' });
      return;
    }
    const updated = await SystemAuthService.updateProfile(req.user!.id, {
      fullName: fullName ? String(fullName).trim() : undefined,
      ...(avatar !== undefined && { avatar: avatar || null })
    });
    res.json({ message: 'Cập nhật thành công', user: updated });
  } catch (error: any) {
    next(error);
  }
});

// ─── Scope management endpoints ───────────────────────────────────────────────

/**
 * GET /auth/users/:id/scope
 * Returns the province and station scope assigned to a user.
 * Accessible by sa and engineer.
 */
router.get('/users/:id/scope', authenticateToken, authorizeRoles(['sa', 'engineer']), async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const scopeData = await ScopeService.getUserScope(targetId);
    res.json({ data: scopeData });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /auth/users/:id/scope
 * Replaces the province and/or station scope for a user.
 * Only sa can assign scope. regional_manager gets provinceIds, station_supervisor gets stationIds.
 * Body: { provinceIds?: number[], stationIds?: number[] }
 */
router.put('/users/:id/scope', authenticateToken, authorizeRoles(['sa']), async (req: AuthRequest, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const { provinceIds, stationIds } = req.body as { provinceIds?: number[]; stationIds?: number[] };

    if (provinceIds !== undefined) {
      if (!Array.isArray(provinceIds) || provinceIds.some(x => typeof x !== 'number')) {
        res.status(400).json({ message: 'provinceIds phải là mảng số nguyên' });
        return;
      }
      await ScopeService.setProvinceScope(targetId, provinceIds);
    }

    if (stationIds !== undefined) {
      if (!Array.isArray(stationIds) || stationIds.some(x => typeof x !== 'number')) {
        res.status(400).json({ message: 'stationIds phải là mảng số nguyên' });
        return;
      }
      await ScopeService.setStationScope(targetId, stationIds);
    }

    const targetUser = await SystemAuthService.getById(targetId);
    auditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      role: req.user!.role,
      action: 'USER_SCOPE_UPDATE',
      entityType: 'system_user',
      entityId: targetId,
      entityName: targetUser.username,
      details: { provinceIds, stationIds },
      ip: req.ip,
    });

    const updated = await ScopeService.getUserScope(targetId);
    res.json({ message: 'Cập nhật phạm vi quản lý thành công', data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;