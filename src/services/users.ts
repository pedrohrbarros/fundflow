import { db } from '../config/db'
import type { ServiceResult } from './types'

export type UserRecord = {
  id: string
  country: string
  created_at: string
  updated_at: string
}

export const UserService = {
  async getMe(user_external_id: string): Promise<ServiceResult<UserRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      return {
        ok: true,
        data: {
          id: user.id.toString(),
          country: user.country,
          created_at: user.created_at.toISOString(),
          updated_at: user.updated_at.toISOString(),
        },
      }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to fetch user',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async updateCountry(
    user_external_id: string,
    country: string
  ): Promise<ServiceResult<UserRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const updated = await db.user.update({
        where: { id: user.id },
        data: { country },
      })
      return {
        ok: true,
        data: {
          id: updated.id.toString(),
          country: updated.country,
          created_at: updated.created_at.toISOString(),
          updated_at: updated.updated_at.toISOString(),
        },
      }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to update country',
        meta: { error: (err as Error)?.message },
      }
    }
  },
}
