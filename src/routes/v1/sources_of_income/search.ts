import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'
import { parsePagination } from '../../../helpers/pagination'
import { parseFilterBody } from '../../../helpers/filters'
import type { FilterNode } from '../../../helpers/filters'
import type { FieldAllowlist } from '../../../helpers/filters'
import { resolvePeriod } from '../../../helpers/period'

const SOURCE_OF_INCOME_ALLOWED_FIELDS: FieldAllowlist = {
  name: 'string',
  income: 'float',
  currency: 'string',
  created_at: 'datetime',
  updated_at: 'datetime',
}

export const searchSourcesOfIncome = async ({
  user_external_id,
  body,
  set,
}: {
  user_external_id: string
  body: { page?: number; limit?: number; filters?: unknown; granularity?: unknown; date?: unknown }
  set: { status?: number | string }
}) => {
  const pagination = parsePagination({
    page: body.page !== undefined ? String(body.page) : undefined,
    limit: body.limit !== undefined ? String(body.limit) : undefined,
  })
  if (!pagination.ok) return handleError(set, 400, pagination.error)

  let filters: FilterNode | undefined
  if (body.filters !== undefined) {
    const result = parseFilterBody(body.filters, SOURCE_OF_INCOME_ALLOWED_FIELDS)
    if (!result.ok) return handleError(set, 400, result.error)
    filters = result.node
  }

  const period = resolvePeriod(body as { granularity?: unknown; date?: unknown })
  if (!period.ok) return handleError(set, 400, period.error)

  const result = await SourcesOfIncomeService.search(
    user_external_id,
    pagination.page,
    pagination.limit,
    period.period,
    filters
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
