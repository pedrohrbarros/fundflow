import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'
import { SourceOfIncomeCreateSchema } from '../../../schemas/sources_of_income'

export const createSourceOfIncome = async ({
  user_external_id,
  body,
  set,
}: {
  user_external_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = SourceOfIncomeCreateSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await SourcesOfIncomeService.create(user_external_id, {
    name: parsed.data.name,
    category_id: BigInt(parsed.data.category_id),
    income: parsed.data.income,
    currency: parsed.data.currency,
    date: parsed.data.date,
    is_recurring: parsed.data.is_recurring,
  })
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
