import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'
import { SourceOfIncomeCreateSchema } from '../../../schemas/sources_of_income'

export const createSourceOfIncome = async ({
  clerk_user_id,
  body,
  set,
}: {
  clerk_user_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = SourceOfIncomeCreateSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await SourcesOfIncomeService.create(
    clerk_user_id,
    parsed.data.name,
    BigInt(parsed.data.category_id),
    parsed.data.income
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
