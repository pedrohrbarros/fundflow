import { ExpensesService } from '../../../services/expenses'
import { handleError } from '../../../middleware/error'
import { ExpenseCreateSchema } from '../../../schemas/expenses'

export const createExpense = async ({
  user_external_id,
  body,
  set,
}: {
  user_external_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = ExpenseCreateSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await ExpensesService.create(user_external_id, parsed.data)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
