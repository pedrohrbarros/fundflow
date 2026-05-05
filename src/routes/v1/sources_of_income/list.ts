import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'

export const listSourcesOfIncome = async ({
  clerk_user_id,
  set,
}: {
  clerk_user_id: string
  set: { status?: number | string }
}) => {
  const result = await SourcesOfIncomeService.listForUser(clerk_user_id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return { sources_of_income: result.data }
}
