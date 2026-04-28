import type { Context } from 'elysia'
import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'
import type { SourceOfIncomeUpdateBodyType } from '../../../types/sources_of_income'

export const updateSourceOfIncome = async ({ params, body, set }: Context) => {
  const id = BigInt((params as { id: string }).id)
  const { name, category_id, income } = body as SourceOfIncomeUpdateBodyType
  const data: { name?: string; category_id?: bigint; income?: number } = {}
  if (name !== undefined) data.name = name
  if (category_id !== undefined) data.category_id = BigInt(category_id)
  if (income !== undefined) data.income = income
  const result = await SourcesOfIncomeService.update(id, data)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
