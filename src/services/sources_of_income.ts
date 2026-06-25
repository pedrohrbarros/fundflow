import { db } from '../config/db'
import { db_logger } from '../config/logging'
import type { ServiceResult } from './types'
import type { SourceOfIncomeRecord } from '../types/sources_of_income'
import { buildWhereClause } from '../helpers/filters'
import type { FilterNode } from '../helpers/filters'
import { periodRange, periodContribution, type PeriodInput } from '../helpers/period'

function toRecord(source: {
  id: bigint
  name: string
  category_id: bigint | null
  income: number
  currency: string
  date: Date
  is_recurring: boolean
  created_at: Date
  updated_at: Date
}): SourceOfIncomeRecord {
  return {
    id: Number(source.id),
    name: source.name,
    category_id: source.category_id != null ? Number(source.category_id) : null,
    income: source.income,
    currency: source.currency,
    date: source.date.toISOString().slice(0, 10),
    is_recurring: source.is_recurring,
    created_at: source.created_at.toISOString(),
    updated_at: source.updated_at.toISOString(),
  }
}

export const SourcesOfIncomeService = {
  async create(
    user_external_id: string,
    input: {
      name: string
      category_id: bigint | null
      income?: number
      currency?: string
      date: string
      is_recurring?: boolean
    }
  ): Promise<ServiceResult<SourceOfIncomeRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const count = await db.sourceOfIncome.count({ where: { user_id: user.id } })
      if (count >= 100)
        return { ok: false, status: 400, message: 'Source of income limit reached (100 per user)' }
      if (input.category_id != null) {
        const category = await db.category.findFirst({
          where: { id: input.category_id, user_id: user.id, type: 'INCOME' },
        })
        if (!category)
          return {
            ok: false,
            status: 404,
            message: 'Category not found',
            meta: { category_id: input.category_id.toString() },
          }
      }
      const source_of_income = await db.sourceOfIncome.create({
        data: {
          name: input.name,
          category_id: input.category_id,
          user_id: user.id,
          ...(input.income !== undefined ? { income: input.income } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          date: new Date(`${input.date}T00:00:00.000Z`),
          is_recurring: input.is_recurring ?? false,
        },
      })
      return { ok: true, data: toRecord(source_of_income) }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to create source of income',
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
      sources_of_income: Record<string, (SourceOfIncomeRecord & { period_amount: number })[]>
      total: Record<string, number>
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
      // fetched without a start-date floor on purpose (an old anchor still recurs).
      const where = {
        user_id: user.id,
        AND: [
          ...(filters ? [buildWhereClause(filters)] : []),
          { date: { lte: endDate } },
          { OR: [{ is_recurring: true }, { date: { gte: startDate } }] },
        ],
      }

      const rows = await db.sourceOfIncome.findMany({
        where,
        orderBy: { id: 'asc' },
        include: { category: true },
      })

      const applicable = rows
        .map((r) => ({
          r,
          c: periodContribution(
            { date: r.date, is_recurring: r.is_recurring, amount: r.income },
            period
          ),
        }))
        .filter((x) => x.c.applies)

      const total: Record<string, number> = {}
      for (const x of applicable) {
        total[x.r.currency] = (total[x.r.currency] ?? 0) + x.c.period_amount
      }

      const paged = applicable.slice((page - 1) * limit, (page - 1) * limit + limit)
      const sources_of_income: Record<
        string,
        (SourceOfIncomeRecord & { period_amount: number })[]
      > = {}
      for (const x of paged) {
        const name = x.r.category?.name ?? 'Uncategorized'
        if (!sources_of_income[name]) sources_of_income[name] = []
        sources_of_income[name].push({ ...toRecord(x.r), period_amount: x.c.period_amount })
      }

      return {
        ok: true,
        data: { sources_of_income, total, pagination: { page, limit, total: applicable.length } },
      }
    } catch (err: unknown) {
      db_logger.error(err, 'Failed to fetch sources of income')
      return {
        ok: false,
        status: 500,
        message: 'Failed to fetch sources of income',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async update(
    id: bigint,
    user_external_id: string,
    data: {
      name?: string
      category_id?: bigint | null
      income?: number
      currency?: string
      date?: string
      is_recurring?: boolean
    }
  ): Promise<ServiceResult<SourceOfIncomeRecord>> {
    if (Object.keys(data).length === 0)
      return { ok: false, status: 400, message: 'No fields to update' }
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      if (data.category_id != null) {
        const category = await db.category.findFirst({
          where: { id: data.category_id, user_id: user.id, type: 'INCOME' },
        })
        if (!category)
          return {
            ok: false,
            status: 404,
            message: 'Category not found',
            meta: { category_id: data.category_id.toString() },
          }
      }
      const { date, is_recurring, category_id, ...rest } = data
      const source_of_income = await db.sourceOfIncome.update({
        where: { id, user_id: user.id },
        data: {
          ...rest,
          ...(category_id !== undefined ? { category_id } : {}),
          ...(date !== undefined ? { date: new Date(`${date}T00:00:00.000Z`) } : {}),
          ...(is_recurring !== undefined ? { is_recurring } : {}),
        },
      })
      return { ok: true, data: toRecord(source_of_income) }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Source of income not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to update source of income',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async remove(id: bigint, user_external_id: string): Promise<ServiceResult<{ message: string }>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      await db.sourceOfIncome.delete({ where: { id, user_id: user.id } })
      return { ok: true, data: { message: 'Source of income deleted' } }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Source of income not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to delete source of income',
        meta: { error: (err as Error)?.message },
      }
    }
  },
}
