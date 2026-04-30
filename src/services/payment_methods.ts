import { db } from '../config/db'
import type { ServiceResult } from './types'
import type { PaymentMethodRecord } from '../types/payment_methods'

export const PaymentMethodsService = {
  async create(
    user_external_id: string,
    name: string,
    bank?: string,
    receiver?: string
  ): Promise<ServiceResult<PaymentMethodRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const payment_method = await db.paymentMethod.create({
        data: { name, bank: bank ?? null, receiver: receiver ?? null, user_id: user.id },
      })
      return {
        ok: true,
        data: {
          id: payment_method.id.toString(),
          name: payment_method.name,
          bank: payment_method.bank,
          receiver: payment_method.receiver,
          user_id: payment_method.user_id.toString(),
        },
      }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to create payment method',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async listForUser(user_external_id: string): Promise<ServiceResult<PaymentMethodRecord[]>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const payment_methods = await db.paymentMethod.findMany({
        where: { user_id: user.id },
        orderBy: { id: 'asc' },
      })
      return {
        ok: true,
        data: payment_methods.map((payment_method) => ({
          id: payment_method.id.toString(),
          name: payment_method.name,
          bank: payment_method.bank,
          receiver: payment_method.receiver,
          user_id: payment_method.user_id.toString(),
        })),
      }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to fetch payment methods',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async update(
    id: bigint,
    user_external_id: string,
    data: { name?: string; bank?: string | null; receiver?: string | null }
  ): Promise<ServiceResult<PaymentMethodRecord>> {
    if (Object.keys(data).length === 0)
      return { ok: false, status: 400, message: 'No fields to update' }

    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const payment_method = await db.paymentMethod.update({
        where: { id, user_id: user.id },
        data,
      })
      return {
        ok: true,
        data: {
          id: payment_method.id.toString(),
          name: payment_method.name,
          bank: payment_method.bank,
          receiver: payment_method.receiver,
          user_id: payment_method.user_id.toString(),
        },
      }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Payment method not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to update payment method',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async remove(id: bigint, user_external_id: string): Promise<ServiceResult<{ message: string }>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      await db.paymentMethod.delete({ where: { id, user_id: user.id } })
      return { ok: true, data: { message: 'Payment method deleted' } }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Payment method not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to delete payment method',
        meta: { error: (err as Error)?.message },
      }
    }
  },
}
