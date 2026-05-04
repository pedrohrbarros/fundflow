import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'
import type { SourceOfIncomeUpdateBodyType } from '../../../types/sources_of_income'

export const updateSourceOfIncome = async ({
  clerk_user_id,
  params,
  body,
  set,
}: {
  clerk_user_id: string
  params: { id: string }
  body: unknown
  set: { status?: number | string }
}) => {
  const id = BigInt(params.id)
  const { name, category_id, income } = body as SourceOfIncomeUpdateBodyType
  const data: { name?: string; category_id?: bigint; income?: number } = {}
  if (name !== undefined) data.name = name
  if (category_id !== undefined) data.category_id = BigInt(category_id)
  if (income !== undefined) data.income = income
  const result = await SourcesOfIncomeService.update(id, clerk_user_id, data)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
