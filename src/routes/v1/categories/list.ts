import { CategoriesService } from '../../../services/categories'
import { handleError } from '../../../middleware/error'
import { parsePagination } from '../../../helpers/pagination'

export const listCategories = async ({
  clerk_user_id,
  query,
  set,
}: {
  clerk_user_id: string
  query: { page?: string; limit?: string }
  set: { status?: number | string }
}) => {
  const pagination = parsePagination(query)
  if (!pagination.ok) return handleError(set, 400, pagination.error)
  const result = await CategoriesService.listForUser(
    clerk_user_id,
    pagination.page,
    pagination.limit
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
