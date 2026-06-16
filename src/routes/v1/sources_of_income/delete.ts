import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'

export const deleteSourceOfIncome = async ({
  user_external_id,
  params,
  set,
}: {
  user_external_id: string
  params: { id: string }
  set: { status?: number | string }
}) => {
  const id = BigInt(params.id)
  const result = await SourcesOfIncomeService.remove(id, user_external_id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
