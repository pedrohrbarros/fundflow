import { CategoriesService } from '../../../services/categories'
import { handleError } from '../../../middleware/error'
import { CategoryCreateSchema } from '../../../schemas/categories'

export const createCategory = async ({
  user_external_id,
  body,
  set,
}: {
  user_external_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = CategoryCreateSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await CategoriesService.create(
    user_external_id,
    parsed.data.name,
    parsed.data.type
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
