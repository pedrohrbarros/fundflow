import { ExpensesService } from '../../../services/expenses'
import { handleError } from '../../../middleware/error'

export const listExpenses = async ({
  clerk_user_id,
  query,
  set,
}: {
  clerk_user_id: string
  query: { page?: string; limit?: string }
  set: { status?: number | string }
}) => {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10) || 20))
  const result = await ExpensesService.listForUser(clerk_user_id, page, limit)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
