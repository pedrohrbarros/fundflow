import { ExpensesService } from '../../../services/expenses'
import { handleError } from '../../../middleware/error'
import { parsePagination } from '../../../helpers/pagination'
import { parseFilterBody } from '../../../helpers/filters'
import type { FilterNode } from '../../../helpers/filters'
import type { FieldAllowlist } from '../../../helpers/filters'
import { resolvePeriod } from '../../../helpers/period'
import { parseSort } from '../../../helpers/sort'

const EXPENSE_SORT_FIELDS = [
  'id',
  'name',
  'amount',
  'period_amount',
  'date',
  'is_recurring',
  'is_paid',
  'is_saved',
  'created_at',
  'updated_at',
] as const

export const EXPENSE_ALLOWED_FIELDS: FieldAllowlist = {
  name: 'string',
  amount: 'float',
  is_paid: 'boolean',
  is_saved: 'boolean',
  saving_location: 'string_nullable',
  created_at: 'datetime',
  updated_at: 'datetime',
}

export const searchExpenses = async ({
  user_external_id,
  body,
  set,
}: {
  user_external_id: string
  body: {
    page?: number
    limit?: number
    filters?: unknown
    granularity?: unknown
    date?: unknown
    sort?: unknown
  }
  set: { status?: number | string }
}) => {
  const pagination = parsePagination({
    page: body.page !== undefined ? String(body.page) : undefined,
    limit: body.limit !== undefined ? String(body.limit) : undefined,
  })
  if (!pagination.ok) return handleError(set, 400, pagination.error)

  let filters: FilterNode | undefined
  if (body.filters !== undefined) {
    const result = parseFilterBody(body.filters, EXPENSE_ALLOWED_FIELDS)
    if (!result.ok) return handleError(set, 400, result.error)
    filters = result.node
  }

  const period = resolvePeriod(body as { granularity?: unknown; date?: unknown })
  if (!period.ok) return handleError(set, 400, period.error)

  const sortResult = parseSort(body.sort, EXPENSE_SORT_FIELDS)
  if (!sortResult.ok) return handleError(set, 400, sortResult.error)

  const result = await ExpensesService.search(
    user_external_id,
    pagination.page,
    pagination.limit,
    period.period,
    filters,
    sortResult.sort
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
