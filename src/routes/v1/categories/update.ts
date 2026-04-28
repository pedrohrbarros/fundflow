import type { Context } from 'elysia'
import { db } from '../../../../config/db'
import { handleError } from '../../../../middleware/error'
import type { CategoryUpdateBodyType } from '../../../../types/categories'

export const updateCategory = async ({ params, body, set }: Context) => {
  const id = BigInt((params as { id: string }).id)
  const { name } = body as CategoryUpdateBodyType

  let category
  try {
    category = await db.sourceOfIncomeCategory.update({ where: { id }, data: { name } })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2025')
      return handleError(set, 404, 'Category not found', { id: id.toString() })
    return handleError(set, 500, 'Failed to update category', { err })
  }

  return { id: category.id.toString(), name: category.name }
}
