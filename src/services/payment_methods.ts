import { db } from '../config/db'
import { db_logger } from '../config/logging'
import type { ServiceResult } from './types'
import type { PaymentMethodRecord } from '../types/payment_methods'
import { buildWhereClause } from '../helpers/filters'
import type { FilterNode } from '../helpers/filters'

type PaymentMethodListData = {
  payment_methods: PaymentMethodRecord[]
  pagination: { page: number; limit: number; total: number }
}

export const PaymentMethodsService = {
  async create(
    user_external_id: string,
    name: string,
    origin: string,
    receiver?: string
  ): Promise<ServiceResult<PaymentMethodRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const count = await db.paymentMethod.count({ where: { user_id: user.id } })
      if (count >= 100)
        return { ok: false, status: 400, message: 'Payment method limit reached (100 per user)' }
      const payment_method = await db.paymentMethod.create({
        data: { name, origin, receiver: receiver ?? null, user_id: user.id },
      })
      return {
        ok: true,
        data: {
          id: payment_method.id.toString(),
          name: payment_method.name,
          origin: payment_method.origin,
          receiver: payment_method.receiver,
          user_id: payment_method.user_id.toString(),
          created_at: payment_method.created_at.toISOString(),
          updated_at: payment_method.updated_at.toISOString(),
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

  async search(
    user_external_id: string,
    page: number,
    limit: number,
    filters?: FilterNode
  ): Promise<ServiceResult<PaymentMethodListData>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const where = {
        user_id: user.id,
        ...(filters ? buildWhereClause(filters) : {}),
      }
      const [payment_methods, total] = await db.$transaction([
        db.paymentMethod.findMany({
          where,
          orderBy: { id: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.paymentMethod.count({ where }),
      ])
      return {
        ok: true,
        data: {
          payment_methods: payment_methods.map((pm) => ({
            id: pm.id.toString(),
            name: pm.name,
            origin: pm.origin,
            receiver: pm.receiver,
            user_id: pm.user_id.toString(),
            created_at: pm.created_at.toISOString(),
            updated_at: pm.updated_at.toISOString(),
          })),
          pagination: { page, limit, total },
        },
      }
    } catch (err: unknown) {
      db_logger.error(err, 'Failed to fetch payment methods')
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
    data: { name?: string; origin?: string; receiver?: string | null }
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
          origin: payment_method.origin,
          receiver: payment_method.receiver,
          user_id: payment_method.user_id.toString(),
          created_at: payment_method.created_at.toISOString(),
          updated_at: payment_method.updated_at.toISOString(),
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
