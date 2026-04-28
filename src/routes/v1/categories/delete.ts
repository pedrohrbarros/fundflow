import type { Context } from 'elysia'
import { db } from '../../../../config/db'
import { handleError } from '../../../../middleware/error'

export const deleteCategory = async ({ params, set }: Context) => {
  const id = BigInt((params as { id: string }).id)

  try {
    await db.sourceOfIncomeCategory.delete({ where: { id } })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2025')
      return handleError(set, 404, 'Category not found', { id: id.toString() })
    return handleError(set, 500, 'Failed to delete category', { err })
  }

  return { message: 'Category deleted' }
}
