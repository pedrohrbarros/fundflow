import { ExpensesService } from '../../../services/expenses'
import { handleError } from '../../../middleware/error'
import type { ExpenseCreateBodyType } from '../../../types/expenses'

export const createExpense = async ({
  clerk_user_id,
  body,
  set,
}: {
  clerk_user_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const input = body as ExpenseCreateBodyType
  const result = await ExpensesService.create(clerk_user_id, input)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
