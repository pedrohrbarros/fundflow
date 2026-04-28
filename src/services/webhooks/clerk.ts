// src/services/webhooks/clerk.ts
import { db } from '../../config/db'
import type { ServiceResult } from '../types'

export const ClerkWebhookService = {
  async registerUser(
    external_id: string
  ): Promise<ServiceResult<{ id: string; external_id: string }>> {
    try {
      const user = await db.user.create({ data: { external_id } })
      return { ok: true, data: { id: user.id.toString(), external_id: user.external_id } }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to create user',
        meta: { error: (err as Error)?.message, external_id },
      }
    }
  },
}
