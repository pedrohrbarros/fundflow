import { db } from '../config/db'
import { db_logger } from '../config/logging'
import type { ServiceResult } from './types'
import type {
  SourceOfIncomeRecord,
  SourcesOfIncomeByCategoryRecord,
} from '../types/sources_of_income'
import { buildWhereClause } from '../helpers/filters'
import type { FilterNode } from '../helpers/filters'

type SourcesOfIncomeListData = {
  sources_of_income: SourcesOfIncomeByCategoryRecord
  pagination: { page: number; limit: number; total: number }
}

function toRecord(source: {
  id: bigint
  name: string
  category_id: bigint
  income: number
  currency: string
  created_at: Date
  updated_at: Date
}): SourceOfIncomeRecord {
  return {
    id: Number(source.id),
    name: source.name,
    category_id: Number(source.category_id),
    income: source.income,
    currency: source.currency,
    created_at: source.created_at.toISOString(),
    updated_at: source.updated_at.toISOString(),
  }
}

export const SourcesOfIncomeService = {
  async create(
    user_external_id: string,
    name: string,
    category_id: bigint,
    income?: number,
    currency?: string
  ): Promise<ServiceResult<SourceOfIncomeRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const count = await db.sourceOfIncome.count({ where: { user_id: user.id } })
      if (count >= 100)
        return { ok: false, status: 400, message: 'Source of income limit reached (100 per user)' }
      const category = await db.sourceOfIncomeCategory.findFirst({
        where: { id: category_id, user_id: user.id },
      })
      if (!category)
        return {
          ok: false,
          status: 404,
          message: 'Category not found',
          meta: { category_id: category_id.toString() },
        }
      const source_of_income = await db.sourceOfIncome.create({
        data: {
          name,
          category_id,
          user_id: user.id,
          ...(income !== undefined ? { income } : {}),
          ...(currency !== undefined ? { currency } : {}),
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
    filters?: FilterNode
  ): Promise<ServiceResult<SourcesOfIncomeListData>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const where = {
        user_id: user.id,
        ...(filters ? buildWhereClause(filters) : {}),
      }
      const [sources, total] = await db.$transaction([
        db.sourceOfIncome.findMany({
          where,
          orderBy: { id: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { category: true },
        }),
        db.sourceOfIncome.count({ where }),
      ])
      const sources_of_income: SourcesOfIncomeByCategoryRecord = {}
      for (const source of sources) {
        const category_name = source.category.name
        if (!sources_of_income[category_name]) sources_of_income[category_name] = []
        sources_of_income[category_name].push(toRecord(source))
      }
      return {
        ok: true,
        data: {
          sources_of_income,
          pagination: { page, limit, total },
        },
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
    data: { name?: string; category_id?: bigint; income?: number; currency?: string }
  ): Promise<ServiceResult<SourceOfIncomeRecord>> {
    if (Object.keys(data).length === 0)
      return { ok: false, status: 400, message: 'No fields to update' }
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      if (data.category_id) {
        const category = await db.sourceOfIncomeCategory.findFirst({
          where: { id: data.category_id, user_id: user.id },
        })
        if (!category)
          return {
            ok: false,
            status: 404,
            message: 'Category not found',
            meta: { category_id: data.category_id.toString() },
          }
      }
      const source_of_income = await db.sourceOfIncome.update({
        where: { id, user_id: user.id },
        data,
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
