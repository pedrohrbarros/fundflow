import { UpdateCountrySchema } from '../../../schemas/users'
import { UserService } from '../../../services/users'
import { handleError } from '../../../middleware/error'

export const updateCountry = async ({
  clerk_user_id,
  body,
  set,
}: {
  clerk_user_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = UpdateCountrySchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await UserService.updateCountry(clerk_user_id, parsed.data.country)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
