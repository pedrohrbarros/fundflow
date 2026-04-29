import { TestEndpointService } from '../../../services/test_endpoint'
import { handleError } from '../../../middleware/error'

export const getTestEndpoint = async ({
  clerk_user_id,
  set,
}: {
  clerk_user_id: string
  set: { status?: number | string }
}) => {
  const result = TestEndpointService.logUserId(clerk_user_id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
