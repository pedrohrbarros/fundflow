import { PaymentMethodsService } from '../../../services/payment_methods'
import { handleError } from '../../../middleware/error'
import { PaymentMethodUpdateSchema } from '../../../schemas/payment_methods'

export const updatePaymentMethod = async ({
  user_external_id,
  params,
  body,
  set,
}: {
  user_external_id: string
  params: { id: string }
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = PaymentMethodUpdateSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const id = BigInt(params.id)
  const data: { name?: string; origin?: string; receiver?: string | null } = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.origin !== undefined) data.origin = parsed.data.origin
  if (parsed.data.receiver !== undefined) data.receiver = parsed.data.receiver
  const result = await PaymentMethodsService.update(id, user_external_id, data)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
