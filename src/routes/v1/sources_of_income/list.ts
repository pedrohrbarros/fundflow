import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'
import { parsePagination } from '../../../helpers/pagination'

export const listSourcesOfIncome = async ({
  clerk_user_id,
  query,
  set,
}: {
  clerk_user_id: string
  query: { page?: string; limit?: string }
  set: { status?: number | string }
}) => {
  const pagination = parsePagination(query)
  if (!pagination.ok) return handleError(set, 400, pagination.error)
  const result = await SourcesOfIncomeService.listForUser(
    clerk_user_id,
    pagination.page,
    pagination.limit
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
