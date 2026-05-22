import { PaymentMethodsService } from '../../../services/payment_methods'
import { handleError } from '../../../middleware/error'
import { PaymentMethodCreateSchema } from '../../../schemas/payment_methods'

export const createPaymentMethod = async ({
  clerk_user_id,
  body,
  set,
}: {
  clerk_user_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = PaymentMethodCreateSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await PaymentMethodsService.create(
    clerk_user_id,
    parsed.data.name,
    parsed.data.bank,
    parsed.data.receiver
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
