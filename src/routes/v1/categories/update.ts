import { CategoriesService } from '../../../services/categories'
import { handleError } from '../../../middleware/error'
import { CategoryUpdateSchema } from '../../../schemas/categories'

export const updateCategory = async ({
  user_external_id,
  params,
  body,
  set,
}: {
  user_external_id: string
  params: { id: string }
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = CategoryUpdateSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const id = BigInt(params.id)
  const result = await CategoriesService.update(id, user_external_id, parsed.data.name)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
