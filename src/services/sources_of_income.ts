import { db } from '../config/db'
import { cacheGet, cacheSet, cacheDelPattern } from '../middleware/cache'
import { db_logger } from '../config/logging'
import type { ServiceResult } from './types'
import type {
  SourceOfIncomeRecord,
  SourcesOfIncomeByCategoryRecord,
} from '../types/sources_of_income'

type SourcesOfIncomeListData = {
  sources_of_income: SourcesOfIncomeByCategoryRecord
  pagination: { page: number; limit: number; total: number }
}

const soiCacheKey = (user_external_id: string, page: number, limit: number) =>
  `sources_of_income:list:${user_external_id}:${page}:${limit}`

const soiCachePattern = (user_external_id: string) => `sources_of_income:list:${user_external_id}:*`

export const SourcesOfIncomeService = {
  async create(
    user_external_id: string,
    name: string,
    category_id: bigint,
    income?: number
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
        data: { name, category_id, user_id: user.id, ...(income !== undefined ? { income } : {}) },
      })
      await cacheDelPattern(soiCachePattern(user_external_id))
      return {
        ok: true,
        data: {
          id: source_of_income.id.toString(),
          name: source_of_income.name,
          category_id: source_of_income.category_id.toString(),
          income: source_of_income.income,
          created_at: source_of_income.created_at.toISOString(),
          updated_at: source_of_income.updated_at.toISOString(),
        },
      }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to create source of income',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async listForUser(
    user_external_id: string,
    page: number,
    limit: number
  ): Promise<ServiceResult<SourcesOfIncomeListData>> {
    const key = soiCacheKey(user_external_id, page, limit)
    const cached = await cacheGet<SourcesOfIncomeListData>(key)
    if (cached) return { ok: true, data: cached }
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const [sources, total] = await db.$transaction([
        db.sourceOfIncome.findMany({
          where: { user_id: user.id },
          orderBy: { id: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { category: true },
        }),
        db.sourceOfIncome.count({ where: { user_id: user.id } }),
      ])
      const sources_of_income: SourcesOfIncomeByCategoryRecord = {}
      for (const source of sources) {
        const category_name = source.category.name
        if (!sources_of_income[category_name]) sources_of_income[category_name] = []
        sources_of_income[category_name].push({
          id: source.id.toString(),
          name: source.name,
          category_id: source.category_id.toString(),
          income: source.income,
          created_at: source.created_at.toISOString(),
          updated_at: source.updated_at.toISOString(),
        })
      }
      const data: SourcesOfIncomeListData = {
        sources_of_income,
        pagination: { page, limit, total },
      }
      await cacheSet(key, data)
      return { ok: true, data }
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
    data: { name?: string; category_id?: bigint; income?: number }
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
      await cacheDelPattern(soiCachePattern(user_external_id))
      return {
        ok: true,
        data: {
          id: source_of_income.id.toString(),
          name: source_of_income.name,
          category_id: source_of_income.category_id.toString(),
          income: source_of_income.income,
          created_at: source_of_income.created_at.toISOString(),
          updated_at: source_of_income.updated_at.toISOString(),
        },
      }
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
      await cacheDelPattern(soiCachePattern(user_external_id))
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
