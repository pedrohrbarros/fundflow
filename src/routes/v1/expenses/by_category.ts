import { ExpensesService } from '../../../services/expenses'
import { handleError } from '../../../middleware/error'
import { parseFilterBody } from '../../../helpers/filters'
import type { FilterNode } from '../../../helpers/filters'
import { resolvePeriod } from '../../../helpers/period'
import { EXPENSE_ALLOWED_FIELDS } from './search'

export const expensesByCategory = async ({
  user_external_id,
  body,
  set,
}: {
  user_external_id: string
  body: { filters?: unknown; granularity?: unknown; date?: unknown }
  set: { status?: number | string }
}) => {
  let filters: FilterNode | undefined
  if (body.filters !== undefined) {
    const result = parseFilterBody(body.filters, EXPENSE_ALLOWED_FIELDS)
    if (!result.ok) return handleError(set, 400, result.error)
    filters = result.node
  }

  const period = resolvePeriod(body as { granularity?: unknown; date?: unknown })
  if (!period.ok) return handleError(set, 400, period.error)

  const result = await ExpensesService.byCategory(user_external_id, period.period, filters)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
