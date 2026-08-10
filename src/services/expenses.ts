import { db } from '../config/db'
import { db_logger } from '../config/logging'
import type { ServiceResult } from './types'
import type { ExpenseRecord } from '../types/expenses'
import type { ExpenseCreateInput, ExpenseUpdateInput } from '../schemas/expenses'
import { buildWhereClause } from '../helpers/filters'
import type { FilterNode } from '../helpers/filters'
import { periodRange, periodContribution, type PeriodInput } from '../helpers/period'
import { applyInAppSort, type SortSpec, type SortableValue } from '../helpers/sort'

type ExpenseCategoryTotal = {
  category_id: number | null
  name: string
  total: number
  count: number
}
type ExpensesByCategoryData = { by_category: ExpenseCategoryTotal[]; total: number }

type ExpenseWithRelations = {
  id: bigint
  name: string
  category_id: bigint | null
  category: { name: string } | null
  amount: number
  date: Date
  is_recurring: boolean
  recurring_months: number | null
  is_paid: boolean
  paid_period: string | null
  is_saved: boolean
  saved_period: string | null
  saving_location: string | null
  payment_method_id: bigint | null
  payment_method: { id: bigint; name: string; origin: string } | null
  created_at: Date
  updated_at: Date
}

// A recurring expense shows up in every month it recurs into, but ticking Paid or
// Saved only speaks for the month it was ticked in. The flag columns are therefore
// qualified by the period they were set in, and every read derives the status for
// the period being asked about. Non-recurring expenses live in a single month, so
// their plain flags remain authoritative.
const monthOf = (date: string): string => date.slice(0, 7)

const statusForPeriod = (
  expense: { is_recurring: boolean; flag: boolean; period: string | null },
  periodMonth: string
): boolean => (expense.is_recurring ? expense.period === periodMonth : expense.flag)

// The stored period for a flag on update. Unticking the flag, or dropping recurrence
// altogether, clears it; otherwise the caller's period wins and `undefined` leaves
// the column untouched.
const nextPeriod = (
  nextIsRecurring: boolean,
  nextFlag: boolean | undefined,
  nextPeriodInput: string | null | undefined
): string | null | undefined => {
  if (!nextIsRecurring) return null
  if (nextFlag === false) return null
  if (nextPeriodInput !== undefined) return nextPeriodInput ?? null
  return undefined
}

const toRecord = (expense: ExpenseWithRelations): ExpenseRecord => ({
  id: Number(expense.id),
  name: expense.name,
  category_id: expense.category_id != null ? Number(expense.category_id) : null,
  amount: expense.amount,
  date: expense.date.toISOString().slice(0, 10),
  is_recurring: expense.is_recurring,
  recurring_months: expense.recurring_months,
  is_paid: expense.is_paid,
  is_saved: expense.is_saved,
  saving_location: expense.saving_location,
  payment_method_id: expense.payment_method_id != null ? Number(expense.payment_method_id) : null,
  payment_method: expense.payment_method
    ? {
        id: Number(expense.payment_method.id),
        name: expense.payment_method.name,
        origin: expense.payment_method.origin,
      }
    : null,
  created_at: expense.created_at.toISOString(),
  updated_at: expense.updated_at.toISOString(),
})

async function paymentMethodExists(payment_method_id: number, user_id: bigint) {
  const owned = await db.paymentMethod.findFirst({
    where: { id: BigInt(payment_method_id), user_id },
    select: { id: true },
  })
  return owned !== null
}

export const ExpensesService = {
  async create(
    user_external_id: string,
    input: ExpenseCreateInput
  ): Promise<ServiceResult<ExpenseRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }

      if (input.recurring_months != null && !input.is_recurring)
        return {
          ok: false,
          status: 400,
          message: 'recurring_months requires is_recurring to be true',
        }

      if (input.category_id != null) {
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

      if (
        input.payment_method_id != null &&
        !(await paymentMethodExists(input.payment_method_id, user.id))
      )
        return {
          ok: false,
          status: 404,
          message: 'Payment method not found',
          meta: { payment_method_id: String(input.payment_method_id) },
        }

      // A recurring expense created as paid/saved is only paid/saved for the month it
      // is anchored to. Without stamping the period here it would read back as unpaid
      // straight away, since every read derives the status from the period.
      const is_recurring = input.is_recurring ?? false
      const is_paid = input.is_paid ?? false
      const is_saved = input.is_saved ?? false
      const anchorMonth = monthOf(input.date)

      const expense = await db.expense.create({
        data: {
          name: input.name,
          category_id: input.category_id != null ? BigInt(input.category_id) : null,
          amount: input.amount,
          date: new Date(`${input.date}T00:00:00.000Z`),
          is_recurring,
          recurring_months: input.recurring_months ?? null,
          is_paid,
          paid_period: is_recurring && is_paid ? (input.paid_period ?? anchorMonth) : null,
          is_saved,
          saved_period: is_recurring && is_saved ? (input.saved_period ?? anchorMonth) : null,
          saving_location: input.saving_location ?? null,
          payment_method_id:
            input.payment_method_id != null ? BigInt(input.payment_method_id) : null,
          user_id: user.id,
        },
        include: { category: true, payment_method: true },
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
    filters?: FilterNode,
    sort?: SortSpec
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

      const periodMonthStr = `${start.year}-${String(start.month).padStart(2, '0')}`

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
        include: { category: true, payment_method: true },
      })

      const applicable = rows
        .map((r) => ({
          r,
          c: periodContribution(
            {
              date: r.date,
              is_recurring: r.is_recurring,
              amount: r.amount,
              recurring_months: r.recurring_months,
            },
            period
          ),
        }))
        .filter((x) => x.c.applies)

      if (sort) {
        const value = (x: (typeof applicable)[number]): SortableValue => {
          switch (sort.field) {
            case 'period_amount':
              return x.c.period_amount
            case 'amount':
              return x.r.amount
            case 'name':
              return x.r.name
            case 'date':
              return x.r.date.getTime()
            case 'is_recurring':
              return x.r.is_recurring
            case 'is_paid':
              return statusForPeriod(
                { is_recurring: x.r.is_recurring, flag: x.r.is_paid, period: x.r.paid_period },
                periodMonthStr
              )
            case 'is_saved':
              return statusForPeriod(
                { is_recurring: x.r.is_recurring, flag: x.r.is_saved, period: x.r.saved_period },
                periodMonthStr
              )
            case 'created_at':
              return x.r.created_at.getTime()
            case 'updated_at':
              return x.r.updated_at.getTime()
            case 'category_name':
              return x.r.category?.name ?? ''
            case 'payment_method_name':
              return x.r.payment_method?.name ?? ''
            default:
              return Number(x.r.id)
          }
        }
        applyInAppSort(applicable, value, sort.direction)
      }

      const total = applicable.reduce((sum, x) => sum + x.c.period_amount, 0)
      const paged = applicable.slice((page - 1) * limit, (page - 1) * limit + limit)

      return {
        ok: true,
        data: {
          expenses: paged.map((x) => ({
            ...toRecord(x.r),
            period_amount: x.c.period_amount,
            is_paid: statusForPeriod(
              { is_recurring: x.r.is_recurring, flag: x.r.is_paid, period: x.r.paid_period },
              periodMonthStr
            ),
            is_saved: statusForPeriod(
              { is_recurring: x.r.is_recurring, flag: x.r.is_saved, period: x.r.saved_period },
              periodMonthStr
            ),
          })),
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

      // Determine the resulting is_recurring and recurring_months after the update.
      const nextIsRecurring =
        input.is_recurring !== undefined ? input.is_recurring : existing.is_recurring
      // Auto-clear recurring_months when is_recurring is flipped to false.
      const nextRecurringMonths = !nextIsRecurring
        ? null
        : input.recurring_months !== undefined
          ? input.recurring_months
          : existing.recurring_months
      if (nextRecurringMonths != null && !nextIsRecurring)
        return {
          ok: false,
          status: 400,
          message: 'recurring_months requires is_recurring to be true',
        }

      if (input.category_id != null) {
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

      if (
        input.payment_method_id != null &&
        !(await paymentMethodExists(input.payment_method_id, user.id))
      )
        return {
          ok: false,
          status: 404,
          message: 'Payment method not found',
          meta: { payment_method_id: String(input.payment_method_id) },
        }

      const expense = await db.expense.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.category_id !== undefined
            ? { category_id: input.category_id === null ? null : BigInt(input.category_id) }
            : {}),
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.date !== undefined ? { date: new Date(`${input.date}T00:00:00.000Z`) } : {}),
          ...(input.is_recurring !== undefined ? { is_recurring: input.is_recurring } : {}),
          recurring_months: nextRecurringMonths,
          ...(input.is_paid !== undefined ? { is_paid: input.is_paid } : {}),
          paid_period: nextPeriod(nextIsRecurring, input.is_paid, input.paid_period),
          ...(input.is_saved !== undefined ? { is_saved: input.is_saved } : {}),
          saved_period: nextPeriod(nextIsRecurring, input.is_saved, input.saved_period),
          ...(input.saving_location !== undefined
            ? { saving_location: input.saving_location }
            : {}),
          ...(input.payment_method_id !== undefined
            ? {
                payment_method_id:
                  input.payment_method_id == null ? null : BigInt(input.payment_method_id),
              }
            : {}),
        },
        include: { category: true, payment_method: true },
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
        select: {
          category_id: true,
          amount: true,
          date: true,
          is_recurring: true,
          recurring_months: true,
        },
      })

      const acc = new Map<bigint | null, { total: number; count: number }>()
      for (const r of rows) {
        const c = periodContribution(
          {
            date: r.date,
            is_recurring: r.is_recurring,
            amount: r.amount,
            recurring_months: r.recurring_months,
          },
          period
        )
        if (!c.applies) continue
        const key = r.category_id
        const cur = acc.get(key) ?? { total: 0, count: 0 }
        cur.total += c.period_amount
        cur.count += 1
        acc.set(key, cur)
      }

      const nonNullKeys = [...acc.keys()].filter((k): k is bigint => k !== null)
      const categories = await db.category.findMany({
        where: { id: { in: nonNullKeys } },
        select: { id: true, name: true },
      })
      const nameById = new Map(categories.map((c) => [c.id, c.name]))

      const by_category = [...acc.entries()]
        .map(([key, v]) =>
          key === null
            ? { category_id: null, name: 'Uncategorized', total: v.total, count: v.count }
            : {
                category_id: Number(key),
                name: nameById.get(key) ?? '',
                total: v.total,
                count: v.count,
              }
        )
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
