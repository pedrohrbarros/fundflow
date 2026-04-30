import { PaymentMethodsService } from '../../../services/payment_methods'
import { handleError } from '../../../middleware/error'

export const listPaymentMethods = async ({
  clerk_user_id,
  set,
}: {
  clerk_user_id: string
  set: { status?: number | string }
}) => {
  const result = await PaymentMethodsService.listForUser(clerk_user_id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return { payment_methods: result.data }
}
