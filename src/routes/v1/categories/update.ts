import { CategoriesService } from '../../../services/categories'
import { handleError } from '../../../middleware/error'
import type { CategoryUpdateBodyType } from '../../../types/categories'

export const updateCategory = async ({
  clerk_user_id,
  params,
  body,
  set,
}: {
  clerk_user_id: string
  params: { id: string }
  body: unknown
  set: { status?: number | string }
}) => {
  const id = BigInt(params.id)
  const { name } = body as CategoryUpdateBodyType
  const result = await CategoriesService.update(id, clerk_user_id, name)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
