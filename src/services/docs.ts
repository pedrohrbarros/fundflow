import { db } from '../config/db'
import type { ServiceResult } from './types'

const TEST_USER_PREFIX = 'test-user-'

function currentMonthKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${TEST_USER_PREFIX}${year}-${month}`
}

export const DocsService = {
  async findOrCreateMonthlyTestUser(): Promise<ServiceResult<{ external_id: string }>> {
    try {
      const key = currentMonthKey()

      const existing = await db.user.findUnique({ where: { external_id: key } })
      if (existing) return { ok: true, data: { external_id: existing.external_id } }

      await db.user.deleteMany({
        where: { external_id: { startsWith: TEST_USER_PREFIX } },
      })

      const user = await db.user.create({ data: { external_id: key } })
      return { ok: true, data: { external_id: user.external_id } }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to find or create test user',
        meta: { error: (err as Error)?.message },
      }
    }
  },
}
