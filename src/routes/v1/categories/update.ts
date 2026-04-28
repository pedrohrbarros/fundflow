import type { Context } from 'elysia'
import { CategoriesService } from '../../../../services/categories'
import { handleError } from '../../../../middleware/error'
import type { CategoryUpdateBodyType } from '../../../../types/categories'

export const updateCategory = async ({ params, body, set }: Context) => {
  const id = BigInt((params as { id: string }).id)
  const { name } = body as CategoryUpdateBodyType
  const result = await CategoriesService.update(id, name)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
