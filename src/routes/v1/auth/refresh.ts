import { AuthService } from '../../../services/auth'
import { handleError } from '../../../middleware/error'
import { RefreshSchema } from '../../../schemas/auth'

export const refreshTokens = async ({
  body,
  set,
}: {
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = RefreshSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await AuthService.refresh(parsed.data.refresh_token)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
