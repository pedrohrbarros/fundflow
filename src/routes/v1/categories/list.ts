import { CategoriesService } from '../../../services/categories'
import { handleError } from '../../../middleware/error'

export const listCategories = async ({
  clerk_user_id,
  set,
}: {
  clerk_user_id: string
  set: { status?: number | string }
}) => {
  const result = await CategoriesService.listForUser(clerk_user_id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return { categories: result.data }
}
