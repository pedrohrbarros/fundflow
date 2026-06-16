import { AuthService } from '../../../services/auth'
import { handleError } from '../../../middleware/error'
import { GoogleLoginSchema } from '../../../schemas/auth'

export const googleLogin = async ({
  body,
  set,
}: {
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = GoogleLoginSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await AuthService.loginWithGoogle(parsed.data.id_token)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
