import type { Context } from 'elysia'
import { db } from '../../../../config/db'
import { handleError } from '../../../../middleware/error'

export const listCategories = async ({ set }: Context) => {
  let categories
  try {
    categories = await db.sourceOfIncomeCategory.findMany({ orderBy: { id: 'asc' } })
  } catch (err) {
    return handleError(set, 500, 'Failed to fetch categories', { err })
  }

  return { categories: categories.map((c) => ({ id: c.id.toString(), name: c.name })) }
}
