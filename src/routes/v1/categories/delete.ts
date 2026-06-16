import { CategoriesService } from '../../../services/categories'
import { handleError } from '../../../middleware/error'

export const deleteCategory = async ({
  user_external_id,
  params,
  set,
}: {
  user_external_id: string
  params: { id: string }
  set: { status?: number | string }
}) => {
  const id = BigInt(params.id)
  const result = await CategoriesService.remove(id, user_external_id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
