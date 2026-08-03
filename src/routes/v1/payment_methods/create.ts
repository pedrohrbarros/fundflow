import { PaymentMethodsService } from '../../../services/payment_methods'
import { handleError } from '../../../middleware/error'
import { PaymentMethodCreateSchema } from '../../../schemas/payment_methods'

export const createPaymentMethod = async ({
  user_external_id,
  body,
  set,
}: {
  user_external_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = PaymentMethodCreateSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await PaymentMethodsService.create(
    user_external_id,
    parsed.data.name,
    parsed.data.origin
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
