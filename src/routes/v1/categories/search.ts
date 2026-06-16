import { CategoriesService } from '../../../services/categories'
import { handleError } from '../../../middleware/error'
import { parsePagination } from '../../../helpers/pagination'
import { parseFilterBody } from '../../../helpers/filters'
import type { FilterNode } from '../../../helpers/filters'
import type { FieldAllowlist } from '../../../helpers/filters'

const CATEGORY_ALLOWED_FIELDS: FieldAllowlist = {
  name: 'string',
  type: 'string',
  created_at: 'datetime',
  updated_at: 'datetime',
}

export const searchCategories = async ({
  user_external_id,
  body,
  set,
}: {
  user_external_id: string
  body: { page?: number; limit?: number; filters?: unknown }
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

  const result = await CategoriesService.search(
    user_external_id,
    pagination.page,
    pagination.limit,
    filters
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
