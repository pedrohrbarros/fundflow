import { CategoriesService } from '../../../services/categories'
import { handleError } from '../../../middleware/error'
import { CategoryCreateSchema } from '../../../schemas/categories'

export const createCategory = async ({
  clerk_user_id,
  body,
  set,
}: {
  clerk_user_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = CategoryCreateSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await CategoriesService.create(clerk_user_id, parsed.data.name, parsed.data.type)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
