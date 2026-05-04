import { db } from '../config/db'
import { cacheGet, cacheSet, cacheDel } from '../middleware/cache'
import type { ServiceResult } from './types'

type CategoryRecord = { id: string; name: string }

const CACHE_KEY = 'categories:list'

export const CategoriesService = {
  async create(name: string): Promise<ServiceResult<CategoryRecord>> {
    try {
      const category = await db.sourceOfIncomeCategory.create({ data: { name } })
      await cacheDel(CACHE_KEY)
      return { ok: true, data: { id: category.id.toString(), name: category.name } }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to create category',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async list(): Promise<ServiceResult<CategoryRecord[]>> {
    const cached = await cacheGet<CategoryRecord[]>(CACHE_KEY)
    if (cached) return { ok: true, data: cached }
    try {
      const categories = await db.sourceOfIncomeCategory.findMany({ orderBy: { id: 'asc' } })
      const data = categories.map((c) => ({ id: c.id.toString(), name: c.name }))
      await cacheSet(CACHE_KEY, data)
      return { ok: true, data }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to fetch categories',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async update(id: bigint, name: string): Promise<ServiceResult<CategoryRecord>> {
    try {
      const category = await db.sourceOfIncomeCategory.update({ where: { id }, data: { name } })
      await cacheDel(CACHE_KEY)
      return { ok: true, data: { id: category.id.toString(), name: category.name } }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Category not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to update category',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async remove(id: bigint): Promise<ServiceResult<{ message: string }>> {
    try {
      await db.sourceOfIncomeCategory.delete({ where: { id } })
      await cacheDel(CACHE_KEY)
      return { ok: true, data: { message: 'Category deleted' } }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Category not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to delete category',
        meta: { error: (err as Error)?.message },
      }
    }
  },
}
