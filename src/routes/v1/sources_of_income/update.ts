import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'
import { SourceOfIncomeUpdateSchema } from '../../../schemas/sources_of_income'

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
  const parsed = SourceOfIncomeUpdateSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const id = BigInt(params.id)
  const data: { name?: string; category_id?: bigint; income?: number } = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.category_id !== undefined) data.category_id = BigInt(parsed.data.category_id)
  if (parsed.data.income !== undefined) data.income = parsed.data.income
  const result = await SourcesOfIncomeService.update(id, clerk_user_id, data)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
