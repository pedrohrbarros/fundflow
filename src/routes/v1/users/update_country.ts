import { UpdateCountrySchema } from '../../../schemas/users'
import { UserService } from '../../../services/users'
import { handleError } from '../../../middleware/error'

export const updateCountry = async ({
  user_external_id,
  body,
  set,
}: {
  user_external_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = UpdateCountrySchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await UserService.updateCountry(user_external_id, parsed.data.country)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
