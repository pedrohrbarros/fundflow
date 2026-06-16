import { ExpensesService } from '../../../services/expenses'
import { handleError } from '../../../middleware/error'
import { ExpenseUpdateSchema } from '../../../schemas/expenses'

export const updateExpense = async ({
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
  const parsed = ExpenseUpdateSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const id = BigInt(params.id)
  const result = await ExpensesService.update(id, user_external_id, parsed.data)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
