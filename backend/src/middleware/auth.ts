import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const getJwtSecret = () => process.env.JWT_SECRET || 'fallback_secret';

export type UserRole = 'sa' | 'engineer' | 'agency' | 'regional_manager' | 'station_supervisor';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  agencyId: number | null;
  avatar?: string | null;
  mustChangePassword?: boolean;
}

/**
 * Scope context fetched from DB for roles that have geographic/station-level access.
 * Populated by the `attachScope` middleware — do NOT trust JWT for this.
 */
export interface ScopeContext {
  provinceIds?: number[] | null;
  stationIds?: number[] | null;
}

/**
 * Unified scope passed to service methods.
 * Exactly one field will be non-null for scoped roles; all null for sa/engineer.
 */
export interface RequestScope {
  role?: UserRole;
  agencyId?: number | null;
  provinceIds?: number[] | null;
  stationIds?: number[] | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  scope?: ScopeContext;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, getJwtSecret(), (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

export const authorizeRole = (roleIds: number[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const legacyRoleMap: Record<number, UserRole> = {
      1: 'sa',
      2: 'engineer',
      3: 'agency'
    };

    const allowedRoles = roleIds
      .map((roleId) => legacyRoleMap[roleId])
      .filter(Boolean) as UserRole[];

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    next();
  };
};

export const authorizeRoles = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập chức năng này' });
    }

    next();
  };
};

export function getAgencyScope(req: AuthRequest, fallbackAgencyId?: number | null) {
  if (req.user?.role === 'agency') {
    return req.user.agencyId ?? null;
  }

  return fallbackAgencyId ?? null;
}

/**
 * Returns a unified RequestScope for the current user.
 * Controllers pass this to service methods instead of just agencyId.
 */
export function getRequestScope(req: AuthRequest, fallbackAgencyId?: number | null): RequestScope {
  const user = req.user;
  const role = user?.role;
  const scope = req.scope;

  return {
    role,
    agencyId: role === 'agency' ? (user?.agencyId ?? null) : (fallbackAgencyId ?? null),
    provinceIds: role === 'regional_manager' ? (scope?.provinceIds ?? []) : [],
    stationIds: role === 'station_supervisor' ? (scope?.stationIds ?? []) : []
  };
}

/**
 * Middleware: fetches province/station scope from DB and attaches to req.scope.
 * Must run after authenticateToken.
 * Imported lazily to avoid circular deps with scope.service.
 */
export const attachScope = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next();

    const { role, id } = req.user;

    if (role === 'regional_manager') {
      const { ScopeService } = await import('../services/scope.service.js');
      req.scope = { provinceIds: await ScopeService.getProvinceScope(id) };
    } else if (role === 'station_supervisor') {
      const { ScopeService } = await import('../services/scope.service.js');
      req.scope = { stationIds: await ScopeService.getStationScope(id) };
    } else {
      req.scope = {};
    }

    next();
  } catch (error) {
    console.error('Error in attachScope middleware:', error);
    next(error);
  }
};
