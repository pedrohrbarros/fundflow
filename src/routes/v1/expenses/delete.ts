import { ExpensesService } from '../../../services/expenses'
import { handleError } from '../../../middleware/error'

export const deleteExpense = async ({
  clerk_user_id,
  params,
  set,
}: {
  clerk_user_id: string
  params: { id: string }
  set: { status?: number | string }
}) => {
  const id = BigInt(params.id)
  const result = await ExpensesService.remove(id, clerk_user_id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
