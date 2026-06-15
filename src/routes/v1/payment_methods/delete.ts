import { PaymentMethodsService } from '../../../services/payment_methods'
import { handleError } from '../../../middleware/error'

export const deletePaymentMethod = async ({
  user_external_id,
  params,
  set,
}: {
  user_external_id: string
  params: { id: string }
  set: { status?: number | string }
}) => {
  const id = BigInt((params as { id: string }).id)
  const result = await PaymentMethodsService.remove(id, user_external_id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
