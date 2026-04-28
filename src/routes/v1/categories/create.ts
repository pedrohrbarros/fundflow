import type { Context } from 'elysia'
import { db } from '../../../../config/db'
import { handleError } from '../../../../middleware/error'
import type { CategoryCreateBodyType } from '../../../../types/categories'

export const createCategory = async ({ body, set }: Context) => {
  const { name } = body as CategoryCreateBodyType

  let category
  try {
    category = await db.sourceOfIncomeCategory.create({ data: { name } })
  } catch (err) {
    return handleError(set, 500, 'Failed to create category', { err })
  }

  set.status = 201
  return { id: category.id.toString(), name: category.name }
}
