import { ExpensesService } from '../../../services/expenses'
import { handleError } from '../../../middleware/error'
import { parseFilterBody } from '../../../helpers/filters'
import type { FilterNode } from '../../../helpers/filters'
import { EXPENSE_ALLOWED_FIELDS } from './search'

export const expensesByCategory = async ({
  clerk_user_id,
  body,
  set,
}: {
  clerk_user_id: string
  body: { filters?: unknown }
  set: { status?: number | string }
}) => {
  let filters: FilterNode | undefined
  if (body.filters !== undefined) {
    const result = parseFilterBody(body.filters, EXPENSE_ALLOWED_FIELDS)
    if (!result.ok) return handleError(set, 400, result.error)
    filters = result.node
  }

  const result = await ExpensesService.byCategory(clerk_user_id, filters)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
