import { AuthService } from '../../../services/auth'
import { handleError } from '../../../middleware/error'
import { LogoutSchema } from '../../../schemas/auth'

export const logout = async ({
  body,
  set,
}: {
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = LogoutSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await AuthService.logout(parsed.data.refresh_token)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 204
  return null
}
