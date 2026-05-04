import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'
import type { SourceOfIncomeCreateBodyType } from '../../../types/sources_of_income'

export const createSourceOfIncome = async ({
  clerk_user_id,
  body,
  set,
}: {
  clerk_user_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const { name, category_id, income } = body as SourceOfIncomeCreateBodyType
  const result = await SourcesOfIncomeService.create(
    clerk_user_id,
    name,
    BigInt(category_id),
    income
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
