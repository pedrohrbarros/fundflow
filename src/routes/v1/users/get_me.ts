import { UserService } from '../../../services/users'
import { handleError } from '../../../middleware/error'

export const getMe = async ({
  user_external_id,
  set,
}: {
  user_external_id: string
  set: { status?: number | string }
}) => {
  const result = await UserService.getMe(user_external_id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
