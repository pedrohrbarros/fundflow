import { db } from '../config/db'
import { cacheGet, cacheSet, cacheDelPattern } from '../middleware/cache'
import type { ServiceResult } from './types'

type CategoryRecord = { id: string; name: string; created_at: string; updated_at: string }

type CategoryListData = {
  categories: CategoryRecord[]
  pagination: { page: number; limit: number; total: number }
}

const catCacheKey = (user_external_id: string, page: number, limit: number) =>
  `categories:list:${user_external_id}:${page}:${limit}`

const catCachePattern = (user_external_id: string) => `categories:list:${user_external_id}:*`

export const CategoriesService = {
  async create(user_external_id: string, name: string): Promise<ServiceResult<CategoryRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const count = await db.sourceOfIncomeCategory.count({ where: { user_id: user.id } })
      if (count >= 100)
        return { ok: false, status: 400, message: 'Category limit reached (100 per user)' }
      const category = await db.sourceOfIncomeCategory.create({
        data: { name, user_id: user.id },
      })
      await cacheDelPattern(catCachePattern(user_external_id))
      return {
        ok: true,
        data: {
          id: category.id.toString(),
          name: category.name,
          created_at: category.created_at.toISOString(),
          updated_at: category.updated_at.toISOString(),
        },
      }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to create category',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async listForUser(
    user_external_id: string,
    page: number,
    limit: number
  ): Promise<ServiceResult<CategoryListData>> {
    const key = catCacheKey(user_external_id, page, limit)
    const cached = await cacheGet<CategoryListData>(key)
    if (cached) return { ok: true, data: cached }
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const [categories, total] = await db.$transaction([
        db.sourceOfIncomeCategory.findMany({
          where: { user_id: user.id },
          orderBy: { id: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.sourceOfIncomeCategory.count({ where: { user_id: user.id } }),
      ])
      const data: CategoryListData = {
        categories: categories.map((c) => ({
          id: c.id.toString(),
          name: c.name,
          created_at: c.created_at.toISOString(),
          updated_at: c.updated_at.toISOString(),
        })),
        pagination: { page, limit, total },
      }
      await cacheSet(key, data)
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

  async update(
    id: bigint,
    user_external_id: string,
    name: string
  ): Promise<ServiceResult<CategoryRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const category = await db.sourceOfIncomeCategory.update({
        where: { id, user_id: user.id },
        data: { name },
      })
      await cacheDelPattern(catCachePattern(user_external_id))
      return {
        ok: true,
        data: {
          id: category.id.toString(),
          name: category.name,
          created_at: category.created_at.toISOString(),
          updated_at: category.updated_at.toISOString(),
        },
      }
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

  async remove(id: bigint, user_external_id: string): Promise<ServiceResult<{ message: string }>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      await db.sourceOfIncomeCategory.delete({ where: { id, user_id: user.id } })
      await cacheDelPattern(catCachePattern(user_external_id))
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
