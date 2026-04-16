// scope.service.ts
import db from '../db/index.js';

export const ScopeService = {
  /**
   * Get all province IDs assigned to a regional_manager user.
   */
  async getProvinceScope(userId: number): Promise<number[]> {
    const rows = await db('user_province_scope')
      .where('user_id', userId)
      .select('province_id');
    return rows.map((r: { province_id: number }) => r.province_id);
  },

  /**
   * Get all station IDs assigned to a station_supervisor user.
   */
  async getStationScope(userId: number): Promise<number[]> {
    const rows = await db('user_station_scope')
      .where('user_id', userId)
      .select('station_id');
    return rows.map((r: { station_id: number }) => r.station_id);
  },

  /**
   * Replace all province assignments for a user (full replace).
   */
  async setProvinceScope(userId: number, provinceIds: number[]): Promise<void> {
    await db.transaction(async (trx) => {
      await trx('user_province_scope').where('user_id', userId).delete();
      if (provinceIds.length > 0) {
        await trx('user_province_scope').insert(
          provinceIds.map((pid) => ({ user_id: userId, province_id: pid }))
        );
      }
    });
  },

  /**
   * Replace all station assignments for a user (full replace).
   */
  async setStationScope(userId: number, stationIds: number[]): Promise<void> {
    await db.transaction(async (trx) => {
      await trx('user_station_scope').where('user_id', userId).delete();
      if (stationIds.length > 0) {
        await trx('user_station_scope').insert(
          stationIds.map((sid) => ({ user_id: userId, station_id: sid }))
        );
      }
    });
  },

  /**
   * Get full scope record for a user (used by GET /auth/users/:id/scope).
   */
  async getUserScope(userId: number): Promise<{ provinceIds: number[]; stationIds: number[] }> {
    const [provinceIds, stationIds] = await Promise.all([
      ScopeService.getProvinceScope(userId),
      ScopeService.getStationScope(userId),
    ]);
    return { provinceIds, stationIds };
  },
};
