# Services

Business logic lives here. Each service module is a plain object with async methods that return `ServiceResult<T>` — never throw, never set HTTP status codes. Route handlers own the HTTP layer.

## ServiceResult

Defined in `src/services/types.ts`:

```typescript
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; meta?: Record<string, unknown> }
```

Handlers call `handleError(set, result.status, result.message, result.meta)` when `result.ok` is `false`.

## Modules

| File                   | Export                   | Responsibility                                        |
| ---------------------- | ------------------------ | ----------------------------------------------------- |
| `categories.ts`        | `CategoriesService`      | CRUD + `search()` for `SourceOfIncomeCategory`        |
| `sources_of_income.ts` | `SourcesOfIncomeService` | CRUD + `search()` for `SourceOfIncome`                |
| `payment_methods.ts`   | `PaymentMethodsService`  | User-scoped CRUD + `search()` for `PaymentMethod`     |
| `expenses.ts`          | `ExpensesService`        | User-scoped CRUD + `search()` for `Expense`           |
| `users.ts`             | `UserService`            | `getMe()`, `updateCountry()`, `deleteMe()` for `User` |
| `docs.ts`              | `DocsService`            | Monthly test user lifecycle for Swagger UI access     |

## User-Scoped Services

Services that operate on user-owned records accept `user_external_id: string` (the `external_id` claim from the backend JWT) and resolve the internal `user_id` themselves via `db.user.findUnique({ where: { external_id } })`. This keeps handlers unaware of the internal ID mapping and ensures ownership is always enforced at the service layer.

## DocsService

`DocsService.findOrCreateMonthlyTestUser()` manages a synthetic user for Swagger UI testing:

- Returns the existing `docs-test-user-YYYY-MM` user if it exists for the current month
- Deletes any stale test users from previous months and creates a fresh one otherwise
- Uses `upsert` to handle concurrent requests safely

## Caching

Search endpoints are not cached. The filter key space is unbounded (any combination of filters × pages × limits), making per-response caching ineffective. All search services query the database directly on every request.

## Error Codes

| Prisma error code | Meaning                       | Returned status |
| ----------------- | ----------------------------- | --------------- |
| `P2025`           | Record not found              | 404             |
| `P2003`           | Foreign key constraint failed | 404             |
| (any other)       | Unexpected DB error           | 500             |
