import { ExpensesService } from '../../../services/expenses'
import { handleError } from '../../../middleware/error'
import type { ExpenseUpdateBodyType } from '../../../types/expenses'

export const updateExpense = async ({
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
  const id = BigInt(params.id)
  const input = body as ExpenseUpdateBodyType
  const result = await ExpensesService.update(id, clerk_user_id, input)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
