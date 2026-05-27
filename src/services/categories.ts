import { db } from '../config/db'
import type { ServiceResult } from './types'
import { buildWhereClause } from '../helpers/filters'
import type { FilterNode } from '../helpers/filters'

type CategoryRecord = { id: string; name: string; created_at: string; updated_at: string }

type CategoryListData = {
  categories: CategoryRecord[]
  pagination: { page: number; limit: number; total: number }
}

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

  async search(
    user_external_id: string,
    page: number,
    limit: number,
    filters?: FilterNode
  ): Promise<ServiceResult<CategoryListData>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const where = {
        user_id: user.id,
        ...(filters ? buildWhereClause(filters) : {}),
      }
      const [categories, total] = await db.$transaction([
        db.sourceOfIncomeCategory.findMany({
          where,
          orderBy: { id: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.sourceOfIncomeCategory.count({ where }),
      ])
      return {
        ok: true,
        data: {
          categories: categories.map((c) => ({
            id: c.id.toString(),
            name: c.name,
            created_at: c.created_at.toISOString(),
            updated_at: c.updated_at.toISOString(),
          })),
          pagination: { page, limit, total },
        },
      }
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
