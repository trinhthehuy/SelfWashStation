import type { NextFunction, Request, Response } from 'express';
import config from '../config/index.js';

type AttemptState = {
  failedCount: number;
  windowStartedAt: number;
  blockedUntil: number;
};

type UserLockState = {
  blockedHits: number;
  hitWindowStartedAt: number;
  lockedUntil: number;
};

const attemptsByKey = new Map<string, AttemptState>();
const userLocks = new Map<string, UserLockState>();

function normalizeUsername(rawUsername: unknown): string {
  return String(rawUsername || '').trim().toLowerCase();
}

function getClientIp(req: Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || 'unknown';
}

function getAttemptKey(req: Request): string {
  const username = normalizeUsername(req.body?.username) || '__unknown__';
  return `${getClientIp(req)}:${username}`;
}

function getRequestUsername(req: Request): string {
  return normalizeUsername(req.body?.username);
}

function resetWindowIfNeeded(state: AttemptState, now: number): AttemptState {
  const windowMs = config.auth.loginRateLimitWindowMs;
  if (now - state.windowStartedAt >= windowMs) {
    return {
      failedCount: 0,
      windowStartedAt: now,
      blockedUntil: 0,
    };
  }

  return state;
}

function getRetryAfterSeconds(blockedUntil: number, now: number): number {
  return Math.max(1, Math.ceil((blockedUntil - now) / 1000));
}

function prepareUserLockState(username: string, now: number): UserLockState | null {
  if (!username) {
    return null;
  }

  const current = userLocks.get(username);
  if (!current) {
    return {
      blockedHits: 0,
      hitWindowStartedAt: now,
      lockedUntil: 0,
    };
  }

  const state = { ...current };
  if (state.lockedUntil > 0 && state.lockedUntil <= now) {
    state.lockedUntil = 0;
    state.blockedHits = 0;
    state.hitWindowStartedAt = now;
  }

  const trackingWindowMs = config.auth.loginUserLockTrackWindowMs;
  if (now - state.hitWindowStartedAt >= trackingWindowMs) {
    state.blockedHits = 0;
    state.hitWindowStartedAt = now;
  }

  return state;
}

function getActiveUserLockUntil(username: string, now: number): number {
  const state = prepareUserLockState(username, now);
  if (!state) {
    return 0;
  }

  if (state.lockedUntil > now) {
    userLocks.set(username, state);
    return state.lockedUntil;
  }

  if (state.lockedUntil === 0 && state.blockedHits === 0) {
    userLocks.delete(username);
  } else {
    userLocks.set(username, state);
  }

  return 0;
}

function registerRateLimitBlockHit(username: string, now: number): number {
  const state = prepareUserLockState(username, now);
  if (!state) {
    return 0;
  }

  if (state.lockedUntil > now) {
    userLocks.set(username, state);
    return state.lockedUntil;
  }

  state.blockedHits += 1;
  const threshold = Math.max(1, config.auth.loginUserLockThreshold);
  if (state.blockedHits >= threshold) {
    state.lockedUntil = now + config.auth.loginUserLockMs;
    state.blockedHits = 0;
    state.hitWindowStartedAt = now;
  }

  userLocks.set(username, state);
  return state.lockedUntil;
}

export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = getAttemptKey(req);
  const username = getRequestUsername(req);
  const now = Date.now();
  const currentState = attemptsByKey.get(key);

  const userLockUntil = getActiveUserLockUntil(username, now);
  if (userLockUntil > now) {
    const retryAfterSeconds = getRetryAfterSeconds(userLockUntil, now);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      code: 'ACCOUNT_TEMP_LOCKED',
      message: `Tài khoản bị khóa tạm thời. Vui lòng thử lại sau ${retryAfterSeconds} giây hoặc dùng chức năng Quên mật khẩu.`,
      retryAfterSeconds,
    });
    return;
  }

  if (!currentState) {
    next();
    return;
  }

  const state = resetWindowIfNeeded(currentState, now);
  if (state !== currentState) {
    attemptsByKey.set(key, state);
  }

  if (state.blockedUntil > now) {
    const escalatedLockUntil = registerRateLimitBlockHit(username, now);
    const effectiveBlockedUntil = escalatedLockUntil > now ? escalatedLockUntil : state.blockedUntil;
    const retryAfterSeconds = getRetryAfterSeconds(effectiveBlockedUntil, now);
    const isEscalatedLock = escalatedLockUntil > now;

    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      code: isEscalatedLock ? 'ACCOUNT_TEMP_LOCKED' : 'TOO_MANY_ATTEMPTS',
      message: isEscalatedLock
        ? `Tài khoản bị khóa tạm thời. Vui lòng thử lại sau ${retryAfterSeconds} giây hoặc dùng chức năng Quên mật khẩu.`
        : `Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${retryAfterSeconds} giây.`,
      retryAfterSeconds,
    });
    return;
  }

  if (state.blockedUntil > 0 && state.blockedUntil <= now) {
    attemptsByKey.delete(key);
  }

  next();
}

export function registerLoginFailure(req: Request) {
  const key = getAttemptKey(req);
  const now = Date.now();
  const maxAttempts = Math.max(1, config.auth.loginRateLimitMaxAttempts);
  const existing = attemptsByKey.get(key);

  const baseState = existing
    ? resetWindowIfNeeded(existing, now)
    : {
        failedCount: 0,
        windowStartedAt: now,
        blockedUntil: 0,
      };

  const failedCount = baseState.failedCount + 1;
  const shouldBlock = failedCount >= maxAttempts;

  attemptsByKey.set(key, {
    failedCount,
    windowStartedAt: baseState.windowStartedAt,
    blockedUntil: shouldBlock ? now + config.auth.loginRateLimitWindowMs : 0,
  });
}

export function registerLoginSuccess(req: Request) {
  attemptsByKey.delete(getAttemptKey(req));
  const username = getRequestUsername(req);
  if (username) {
    userLocks.delete(username);
  }
}
