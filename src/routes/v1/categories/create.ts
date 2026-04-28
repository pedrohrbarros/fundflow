import type { Context } from 'elysia'
import { CategoriesService } from '../../../services/categories'
import { handleError } from '../../../middleware/error'
import type { CategoryCreateBodyType } from '../../../types/categories'

export const createCategory = async ({ body, set }: Context) => {
  const { name } = body as CategoryCreateBodyType
  const result = await CategoriesService.create(name)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
