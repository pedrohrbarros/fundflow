import type { Context } from 'elysia'
import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'

export const deleteSourceOfIncome = async ({ params, set }: Context) => {
  const id = BigInt((params as { id: string }).id)
  const result = await SourcesOfIncomeService.remove(id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
