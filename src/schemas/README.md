# Schemas

Zod schemas for request body validation. Each file corresponds to one resource domain and is used by its route handlers before data reaches the service layer.

## Files

| File                   | Schema exports                                             |
| ---------------------- | ---------------------------------------------------------- |
| `categories.ts`        | `CategoryCreateSchema`, `CategoryUpdateSchema`             |
| `sources_of_income.ts` | `SourceOfIncomeCreateSchema`, `SourceOfIncomeUpdateSchema` |
| `payment_methods.ts`   | `PaymentMethodCreateSchema`, `PaymentMethodUpdateSchema`   |
| `expenses.ts`          | `ExpenseCreateSchema`, `ExpenseUpdateSchema`               |
| `users.ts`             | `UpdateCountrySchema`                                      |

## Pattern

Handlers call `schema.safeParse(body)` and return a `400` with field errors if validation fails:

```typescript
const parsed = CategoryCreateSchema.safeParse(body)
if (!parsed.success) {
  set.status = 400
  return { error: parsed.error.flatten().fieldErrors }
}
```

Schemas run Zod validation (runtime safety). The corresponding TypeBox schemas in `src/types/` define the OpenAPI shape shown in Swagger UI. Both are kept in sync manually.
