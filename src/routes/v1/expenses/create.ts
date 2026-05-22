import { ExpensesService } from '../../../services/expenses'
import { handleError } from '../../../middleware/error'
import { ExpenseCreateSchema } from '../../../schemas/expenses'

export const createExpense = async ({
  clerk_user_id,
  body,
  set,
}: {
  clerk_user_id: string
  body: unknown
  set: { status?: number | string }
}) => {
  const parsed = ExpenseCreateSchema.safeParse(body)
  if (!parsed.success) {
    set.status = 400
    return { error: parsed.error.flatten().fieldErrors }
  }
  const result = await ExpensesService.create(clerk_user_id, parsed.data)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  set.status = 201
  return result.data
}
