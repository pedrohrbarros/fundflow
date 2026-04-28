import type { Context } from 'elysia'
import { categoriesService } from '../../../../services/categories'
import { handleError } from '../../../../middleware/error'

export const listCategories = async ({ set }: Context) => {
  const result = await categoriesService.list()
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return { categories: result.data }
}
