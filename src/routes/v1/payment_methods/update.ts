import { PaymentMethodsService } from '../../../services/payment_methods'
import { handleError } from '../../../middleware/error'
import type { PaymentMethodUpdateBodyType } from '../../../types/payment_methods'

export const updatePaymentMethod = async ({
  clerk_user_id,
  params,
  body,
  set,
}: {
  clerk_user_id: string
  params: { id: string }
  body: unknown
  set: { status?: number | string }
}) => {
  const id = BigInt((params as { id: string }).id)
  const { name, bank, receiver } = body as PaymentMethodUpdateBodyType
  const data: { name?: string; bank?: string | null; receiver?: string | null } = {}
  if (name !== undefined) data.name = name
  if (bank !== undefined) data.bank = bank
  if (receiver !== undefined) data.receiver = receiver
  const result = await PaymentMethodsService.update(id, clerk_user_id, data)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
