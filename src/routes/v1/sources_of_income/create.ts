import type { Context } from 'elysia'
import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'
import type { SourceOfIncomeCreateBodyType } from '../../../types/sources_of_income'

export const createSourceOfIncome = async ({ body, set }: Context) => {
  const { name, category_id, income } = body as SourceOfIncomeCreateBodyType
  const result = await SourcesOfIncomeService.create(name, BigInt(category_id), income)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
