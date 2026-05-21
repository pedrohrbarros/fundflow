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

  async deleteUser(external_id: string): Promise<ServiceResult<{ external_id: string }>> {
    try {
      const user = await db.user.findFirst({ where: { external_id } })
      if (!user) return { ok: true, data: { external_id } }

      await db.$transaction([
        db.expensePaymentMethod.deleteMany({ where: { expense: { user_id: user.id } } }),
        db.expense.deleteMany({ where: { user_id: user.id } }),
        db.paymentMethod.deleteMany({ where: { user_id: user.id } }),
        db.sourceOfIncome.deleteMany({ where: { user_id: user.id } }),
        db.sourceOfIncomeCategory.deleteMany({ where: { user_id: user.id } }),
        db.user.delete({ where: { id: user.id } }),
      ])

      return { ok: true, data: { external_id } }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to delete user',
        meta: { error: (err as Error)?.message, external_id },
      }
    }
  },
}
