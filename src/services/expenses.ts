import { db } from '../config/db'
import type { ServiceResult } from './types'
import type { ExpenseRecord, ExpenseCreateBodyType, ExpenseUpdateBodyType } from '../types/expenses'

type Split = { payment_method_id: number; partial_amount: number }

type ExpenseWithSplits = {
  id: bigint
  name: string
  amount: number
  is_paid: boolean
  is_saved: boolean
  saving_location: string | null
  created_at: Date
  updated_at: Date
  payment_methods: { payment_method_id: bigint; partial_amount: number }[]
}

const toRecord = (expense: ExpenseWithSplits): ExpenseRecord => ({
  id: expense.id.toString(),
  name: expense.name,
  amount: expense.amount,
  is_paid: expense.is_paid,
  is_saved: expense.is_saved,
  saving_location: expense.saving_location,
  payment_methods: expense.payment_methods.map((s) => ({
    payment_method_id: s.payment_method_id.toString(),
    partial_amount: s.partial_amount,
  })),
  created_at: expense.created_at.toISOString(),
  updated_at: expense.updated_at.toISOString(),
})

async function validateSplits(
  splits: Split[],
  amount: number,
  user_id: bigint
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const ids = splits.map((s) => s.payment_method_id)
  if (new Set(ids).size !== ids.length)
    return { ok: false, status: 400, message: 'Duplicate payment methods in splits' }

  const sum = splits.reduce((acc, s) => acc + s.partial_amount, 0)
  if (Math.abs(sum - amount) > 0.01)
    return {
      ok: false,
      status: 400,
      message: `Split amounts (${sum}) must equal the total amount (${amount})`,
    }

  const owned = await db.paymentMethod.findMany({
    where: { id: { in: ids.map(BigInt) }, user_id },
    select: { id: true },
  })
  if (owned.length !== ids.length)
    return { ok: false, status: 404, message: 'One or more payment methods not found' }

  return { ok: true }
}

export const ExpensesService = {
  async create(
    user_external_id: string,
    input: ExpenseCreateBodyType
  ): Promise<ServiceResult<ExpenseRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }

      const splits = input.payment_methods ?? []
      if (splits.length > 0) {
        const validation = await validateSplits(splits, input.amount, user.id)
        if (!validation.ok) return validation
      }

      const expense = await db.expense.create({
        data: {
          name: input.name,
          amount: input.amount,
          is_paid: input.is_paid ?? false,
          is_saved: input.is_saved ?? false,
          saving_location: input.saving_location ?? null,
          user_id: user.id,
          ...(splits.length > 0
            ? {
                payment_methods: {
                  createMany: {
                    data: splits.map((s) => ({
                      payment_method_id: BigInt(s.payment_method_id),
                      partial_amount: s.partial_amount,
                    })),
                  },
                },
              }
            : {}),
        },
        include: { payment_methods: true },
      })

      return { ok: true, data: toRecord(expense) }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to create expense',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async listForUser(
    user_external_id: string,
    page: number,
    limit: number
  ): Promise<
    ServiceResult<{
      expenses: ExpenseRecord[]
      pagination: { page: number; limit: number; total: number }
    }>
  > {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }

      const [expenses, total] = await db.$transaction([
        db.expense.findMany({
          where: { user_id: user.id },
          orderBy: { id: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { payment_methods: true },
        }),
        db.expense.count({ where: { user_id: user.id } }),
      ])

      return {
        ok: true,
        data: {
          expenses: expenses.map(toRecord),
          pagination: { page, limit, total },
        },
      }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to fetch expenses',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async update(
    id: bigint,
    user_external_id: string,
    input: ExpenseUpdateBodyType
  ): Promise<ServiceResult<ExpenseRecord>> {
    if (Object.keys(input).length === 0)
      return { ok: false, status: 400, message: 'No fields to update' }

    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }

      const existing = await db.expense.findFirst({ where: { id, user_id: user.id } })
      if (!existing)
        return { ok: false, status: 404, message: 'Expense not found', meta: { id: id.toString() } }

      const splits = input.payment_methods
      const newAmount = input.amount ?? existing.amount

      if (splits !== undefined && splits.length > 0) {
        const validation = await validateSplits(splits, newAmount, user.id)
        if (!validation.ok) return validation
      }

      if (splits !== undefined) {
        await db.expensePaymentMethod.deleteMany({ where: { expense_id: id } })
        if (splits.length > 0) {
          await db.expensePaymentMethod.createMany({
            data: splits.map((s) => ({
              expense_id: id,
              payment_method_id: BigInt(s.payment_method_id),
              partial_amount: s.partial_amount,
            })),
          })
        }
      }

      const expense = await db.expense.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.is_paid !== undefined ? { is_paid: input.is_paid } : {}),
          ...(input.is_saved !== undefined ? { is_saved: input.is_saved } : {}),
          ...(input.saving_location !== undefined
            ? { saving_location: input.saving_location }
            : {}),
        },
        include: { payment_methods: true },
      })

      return { ok: true, data: toRecord(expense) }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to update expense',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async remove(id: bigint, user_external_id: string): Promise<ServiceResult<{ message: string }>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const existing = await db.expense.findFirst({ where: { id, user_id: user.id } })
      if (!existing)
        return { ok: false, status: 404, message: 'Expense not found', meta: { id: id.toString() } }
      await db.expense.delete({ where: { id } })
      return { ok: true, data: { message: 'Expense deleted' } }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to delete expense',
        meta: { error: (err as Error)?.message },
      }
    }
  },
}
