import { UserService } from '../../../services/users'
import { handleError } from '../../../middleware/error'

export const getMe = async ({
  clerk_user_id,
  set,
}: {
  clerk_user_id: string
  set: { status?: number | string }
}) => {
  const result = await UserService.getMe(clerk_user_id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
