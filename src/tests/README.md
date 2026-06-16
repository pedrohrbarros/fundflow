# Tests

Integration and unit tests using [Bun's built-in test runner](https://bun.sh/docs/cli/test).

## Running Tests

```bash
bun test                                              # full suite
bun test src/tests/api/categories.test.ts             # single file
bun test --watch                                      # re-run on file changes
bun test --bail                                       # stop on first failure
```

**Note:** All tests that touch the database connect to your real Supabase instance. `DATABASE_URL` must be set in `.env` before running them. Tests create and clean up their own data.

## Directory Structure

```
tests/
├── api/           # End-to-end API tests (HTTP request → response)
├── db/            # Database model integration tests
├── docs/          # OpenAPI spec validation
├── helpers/       # Unit tests for pagination and filter helpers
├── middleware/    # Unit tests for auth and cache middleware
├── security/      # CORS, rate limiting, logging, and Zod validation tests
├── services/      # Service-layer integration tests
└── stress/        # Rate-limit stress tests
```

## Test Files

| File                                   | What it covers                                               |
| -------------------------------------- | ------------------------------------------------------------ |
| `api/index.test.ts`                    | OpenAPI spec validity, apiKey scheme, `/docs` endpoint       |
| `api/categories.test.ts`               | Full CRUD + search for categories                            |
| `api/sources_of_income.test.ts`        | Full CRUD + search for sources of income                     |
| `api/payment_methods.test.ts`          | Full CRUD + search for payment methods                       |
| `api/expenses.test.ts`                 | Full CRUD + search for expenses (including payment splits)   |
| `api/users.test.ts`                    | GET /users/me, PATCH /users/me, DELETE /users/me             |
| `db/client.test.ts`                    | Prisma client singleton shape                                |
| `db/user.test.ts`                      | User model create/delete                                     |
| `db/source_of_income_category.test.ts` | Category model constraints                                   |
| `db/source_of_income.test.ts`          | Source of income model constraints                           |
| `docs/openapi.test.ts`                 | OpenAPI config metadata and security scheme                  |
| `helpers/pagination.test.ts`           | `parsePagination` edge cases                                 |
| `helpers/filters.test.ts`              | `parseFilterBody` and `buildWhereClause` for all field types |
| `middleware/auth.test.ts`              | `withUserAuth` (docs mode + JWT mode)                        |
| `middleware/cache.test.ts`             | Cache middleware behaviour                                   |
| `security/cors.test.ts`                | CORS allowed origins and headers                             |
| `security/rate-limit.test.ts`          | Rate limiting enforcement                                    |
| `security/logging.test.ts`             | Sensitive data not logged                                    |
| `security/zod-validation.test.ts`      | Zod schema rejects invalid bodies                            |
| `services/docs.test.ts`                | Monthly test user lifecycle (create, reuse, rotate)          |

## Conventions

- Each API test file that needs auth sets `process.env.JWT_SECRET` and uses `signAccessToken` from `src/helpers/auth/tokens` to mint tokens without any external dependency.
- Test data uses timestamped external IDs (`user_cat_test_<Date.now()>`) to avoid collisions across parallel runs.
- `beforeAll` creates required DB fixtures; `afterAll` cleans them up in dependency order (children before parents).
