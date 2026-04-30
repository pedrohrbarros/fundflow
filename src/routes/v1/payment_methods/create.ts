import { PaymentMethodsService } from '../../../services/payment_methods'
import { handleError } from '../../../middleware/error'
import type { PaymentMethodCreateBodyType } from '../../../types/payment_methods'

export const createPaymentMethod = async ({
  clerk_user_id,
  body,
  set,
}: {
  clerk_user_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const { name, bank, receiver } = body as PaymentMethodCreateBodyType
  const result = await PaymentMethodsService.create(clerk_user_id, name, bank, receiver)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
