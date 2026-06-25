import { CategoriesService } from '../../../services/categories'
import { handleError } from '../../../middleware/error'
import { parsePagination } from '../../../helpers/pagination'
import { parseFilterBody } from '../../../helpers/filters'
import { parseSort } from '../../../helpers/sort'
import type { FilterNode } from '../../../helpers/filters'
import type { FieldAllowlist } from '../../../helpers/filters'

const CATEGORY_ALLOWED_FIELDS: FieldAllowlist = {
  name: 'string',
  type: 'string',
  created_at: 'datetime',
  updated_at: 'datetime',
}

const CATEGORY_SORT_FIELDS = ['id', 'name', 'type', 'created_at', 'updated_at'] as const

export const searchCategories = async ({
  user_external_id,
  body,
  set,
}: {
  user_external_id: string
  body: { page?: number; limit?: number; filters?: unknown; sort?: unknown }
  set: { status?: number | string }
}) => {
  const pagination = parsePagination({
    page: body.page !== undefined ? String(body.page) : undefined,
    limit: body.limit !== undefined ? String(body.limit) : undefined,
  })
  if (!pagination.ok) return handleError(set, 400, pagination.error)

  let filters: FilterNode | undefined
  if (body.filters !== undefined) {
    const result = parseFilterBody(body.filters, CATEGORY_ALLOWED_FIELDS)
    if (!result.ok) return handleError(set, 400, result.error)
    filters = result.node
  }

  const sortResult = parseSort(body.sort, CATEGORY_SORT_FIELDS)
  if (!sortResult.ok) return handleError(set, 400, sortResult.error)

  const result = await CategoriesService.search(
    user_external_id,
    pagination.page,
    pagination.limit,
    filters,
    sortResult.sort
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
