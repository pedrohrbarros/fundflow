import type { Context } from 'elysia'
import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'

export const listSourcesOfIncome = async ({ set }: Context) => {
  const result = await SourcesOfIncomeService.list()
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return { sources_of_income: result.data }
}
