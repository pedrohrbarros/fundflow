import { db } from '../config/db'
import { db_logger } from '../config/logging'
import type { ServiceResult } from './types'
import type { ExpenseRecord } from '../types/expenses'
import type { ExpenseCreateInput, ExpenseUpdateInput } from '../schemas/expenses'
import { buildWhereClause } from '../helpers/filters'
import type { FilterNode } from '../helpers/filters'
import { periodRange, periodContribution, type PeriodInput } from '../helpers/period'

type Split = { payment_method_id: number; partial_amount: number }
type ExpenseCategoryTotal = { category_id: number; name: string; total: number; count: number }
type ExpensesByCategoryData = { by_category: ExpenseCategoryTotal[]; total: number }

type ExpenseWithSplits = {
  id: bigint
  name: string
  category_id: bigint
  amount: number
  date: Date
  is_recurring: boolean
  is_paid: boolean
  is_saved: boolean
  saving_location: string | null
  created_at: Date
  updated_at: Date
  payment_methods: {
    payment_method_id: bigint
    partial_amount: number
    payment_method: {
      name: string
      origin: string
      receiver: string | null
    }
  }[]
}

const toRecord = (expense: ExpenseWithSplits): ExpenseRecord => ({
  id: Number(expense.id),
  name: expense.name,
  category_id: Number(expense.category_id),
  amount: expense.amount,
  date: expense.date.toISOString().slice(0, 10),
  is_recurring: expense.is_recurring,
  is_paid: expense.is_paid,
  is_saved: expense.is_saved,
  saving_location: expense.saving_location,
  payment_methods: expense.payment_methods.map((split) => ({
    payment_method_id: Number(split.payment_method_id),
    partial_amount: split.partial_amount,
    name: split.payment_method.name,
    origin: split.payment_method.origin,
    receiver: split.payment_method.receiver,
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
    input: ExpenseCreateInput
  ): Promise<ServiceResult<ExpenseRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }

      const category = await db.category.findFirst({
        where: { id: BigInt(input.category_id), user_id: user.id, type: 'EXPENSE' },
      })
      if (!category)
        return {
          ok: false,
          status: 404,
          message: 'Category not found',
          meta: { category_id: String(input.category_id) },
        }

      const splits = input.payment_methods ?? []
      if (splits.length > 0) {
        const validation = await validateSplits(splits, input.amount, user.id)
        if (!validation.ok) return validation
      }

      const expense = await db.expense.create({
        data: {
          name: input.name,
          category_id: BigInt(input.category_id),
          amount: input.amount,
          date: new Date(`${input.date}T00:00:00.000Z`),
          is_recurring: input.is_recurring ?? false,
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
        include: { payment_methods: { include: { payment_method: true } } },
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

  async search(
    user_external_id: string,
    page: number,
    limit: number,
    period: PeriodInput,
    filters?: FilterNode
  ): Promise<
    ServiceResult<{
      expenses: (ExpenseRecord & { period_amount: number })[]
      total: number
      pagination: { page: number; limit: number; total: number }
    }>
  > {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }

      const { start, end } = periodRange(period)
      const startDate = new Date(Date.UTC(start.year, start.month - 1, start.day))
      const endDate = new Date(Date.UTC(end.year, end.month - 1, end.day))

      // Coarse pre-filter; periodContribution refines below. Recurring rows are
      // intentionally fetched with NO start-date floor: an anchor from years ago
      // still recurs into the current period, so bounding them by startDate would
      // wrongly drop active records. Per-user recurring counts are small.
      const where = {
        user_id: user.id,
        AND: [
          ...(filters ? [buildWhereClause(filters)] : []),
          { date: { lte: endDate } },
          { OR: [{ is_recurring: true }, { date: { gte: startDate } }] },
        ],
      }

      const rows = await db.expense.findMany({
        where,
        orderBy: { id: 'desc' },
        include: { payment_methods: { include: { payment_method: true } } },
      })

      const applicable = rows
        .map((r) => ({
          r,
          c: periodContribution(
            { date: r.date, is_recurring: r.is_recurring, amount: r.amount },
            period
          ),
        }))
        .filter((x) => x.c.applies)

      const total = applicable.reduce((sum, x) => sum + x.c.period_amount, 0)
      const paged = applicable.slice((page - 1) * limit, (page - 1) * limit + limit)

      return {
        ok: true,
        data: {
          expenses: paged.map((x) => ({ ...toRecord(x.r), period_amount: x.c.period_amount })),
          total,
          pagination: { page, limit, total: applicable.length },
        },
      }
    } catch (err: unknown) {
      db_logger.error(err, 'Failed to fetch expenses')
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
    input: ExpenseUpdateInput
  ): Promise<ServiceResult<ExpenseRecord>> {
    if (Object.keys(input).length === 0)
      return { ok: false, status: 400, message: 'No fields to update' }

    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }

      const existing = await db.expense.findFirst({ where: { id, user_id: user.id } })
      if (!existing)
        return { ok: false, status: 404, message: 'Expense not found', meta: { id: id.toString() } }

      if (input.category_id !== undefined) {
        const category = await db.category.findFirst({
          where: { id: BigInt(input.category_id), user_id: user.id, type: 'EXPENSE' },
        })
        if (!category)
          return {
            ok: false,
            status: 404,
            message: 'Category not found',
            meta: { category_id: String(input.category_id) },
          }
      }

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
          ...(input.category_id !== undefined ? { category_id: BigInt(input.category_id) } : {}),
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.date !== undefined ? { date: new Date(`${input.date}T00:00:00.000Z`) } : {}),
          ...(input.is_recurring !== undefined ? { is_recurring: input.is_recurring } : {}),
          ...(input.is_paid !== undefined ? { is_paid: input.is_paid } : {}),
          ...(input.is_saved !== undefined ? { is_saved: input.is_saved } : {}),
          ...(input.saving_location !== undefined
            ? { saving_location: input.saving_location }
            : {}),
        },
        include: { payment_methods: { include: { payment_method: true } } },
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

  async byCategory(
    user_external_id: string,
    period: PeriodInput,
    filters?: FilterNode
  ): Promise<ServiceResult<ExpensesByCategoryData>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }

      const { start, end } = periodRange(period)
      const startDate = new Date(Date.UTC(start.year, start.month - 1, start.day))
      const endDate = new Date(Date.UTC(end.year, end.month - 1, end.day))

      const where = {
        user_id: user.id,
        AND: [
          ...(filters ? [buildWhereClause(filters)] : []),
          { date: { lte: endDate } },
          { OR: [{ is_recurring: true }, { date: { gte: startDate } }] },
        ],
      }

      const rows = await db.expense.findMany({
        where,
        select: { category_id: true, amount: true, date: true, is_recurring: true },
      })

      const acc = new Map<bigint, { total: number; count: number }>()
      for (const r of rows) {
        const c = periodContribution(
          { date: r.date, is_recurring: r.is_recurring, amount: r.amount },
          period
        )
        if (!c.applies) continue
        const cur = acc.get(r.category_id) ?? { total: 0, count: 0 }
        cur.total += c.period_amount
        cur.count += 1
        acc.set(r.category_id, cur)
      }

      const categories = await db.category.findMany({
        where: { id: { in: [...acc.keys()] } },
        select: { id: true, name: true },
      })
      const nameById = new Map(categories.map((c) => [c.id, c.name]))

      const by_category = [...acc.entries()]
        .map(([category_id, v]) => ({
          category_id: Number(category_id),
          name: nameById.get(category_id) ?? '',
          total: v.total,
          count: v.count,
        }))
        .sort((a, b) => b.total - a.total)

      const total = by_category.reduce((s, row) => s + row.total, 0)
      return { ok: true, data: { by_category, total } }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to summarize expenses by category',
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
