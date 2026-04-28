import type { Context } from 'elysia'
import { CategoriesService } from '../../../services/categories'
import { handleError } from '../../../middleware/error'

export const deleteCategory = async ({ params, set }: Context) => {
  const id = BigInt((params as { id: string }).id)
  const result = await CategoriesService.remove(id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
