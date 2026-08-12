# Fundflow

A lightweight financial monitoring API that tracks a user's financial state and monthly spending. Built with [Elysia](https://elysiajs.com/) on the [Bun](https://bun.sh/) runtime.

## Tech Stack

- **Runtime:** Bun
- **Framework:** Elysia
- **Language:** TypeScript
- **Database:** PostgreSQL via [Supabase](https://supabase.com/) + [Prisma 7](https://www.prisma.io/)
- **Cache:** Redis
- **Auth:** Google Sign-In (ID-token verification) + custom HS256 JWTs
- **Documentation:** OpenAPI 3.0 / Swagger UI

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- A [Supabase](https://supabase.com/) project (PostgreSQL)
- A [Google Cloud](https://console.cloud.google.com/) project with an OAuth 2.0 Web Client ID
- A Redis instance

### Installation

```bash
bun install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PORT=8000
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://localhost:6379
API_TOKEN=your_secret_token
ALLOWED_ORIGINS=["http://localhost:3000"]
GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
JWT_SECRET=your_hs256_secret_at_least_32_bytes
LOG_LEVEL=info
NODE_ENV=development
```

| Variable           | Required | Description                                                               |
| ------------------ | -------- | ------------------------------------------------------------------------- |
| `PORT`             | No       | Port to listen on (default: `8000`)                                       |
| `DATABASE_URL`     | Yes      | PostgreSQL connection string (Supabase)                                   |
| `REDIS_URL`        | Yes      | Redis connection string                                                   |
| `API_TOKEN`        | Yes      | Static token used for Swagger UI (docs mode) access                       |
| `ALLOWED_ORIGINS`  | No       | JSON array of allowed CORS origins (default: `["http://localhost:3000"]`) |
| `GOOGLE_CLIENT_ID` | Yes      | Google OAuth Web Client ID — audience used to verify Google ID tokens     |
| `JWT_SECRET`       | Yes      | Secret for signing backend access JWTs (HS256, min 32 bytes)              |
| `LOG_LEVEL`        | No       | Minimum log level (default: `info`)                                       |
| `NODE_ENV`         | No       | Set to `production` for JSON-only log output                              |

### Running the Server

```bash
bun run dev
```

Server starts at `http://localhost:8000`.

## API Reference

Interactive documentation is available at `http://localhost:8000/docs` (Swagger UI).

To use the docs:

1. Open `http://localhost:8000/docs`
2. Click **Authorize** and enter the value of `API_TOKEN` (without quotes)
3. The UI will attach `X-Api-Key` to every request and auto-create a monthly test user as the authenticated identity

### System Endpoints

| Method | Path            | Auth | Description                      |
| ------ | --------------- | ---- | -------------------------------- |
| `GET`  | `/`             | No   | Health check                     |
| `GET`  | `/openapi/json` | No   | OpenAPI 3.0 specification (JSON) |
| `GET`  | `/docs`         | No   | Swagger UI                       |

### Auth Endpoints

| Method | Path                   | Auth | Description                                            |
| ------ | ---------------------- | ---- | ------------------------------------------------------ |
| `POST` | `/api/v1/auth/google`  | No   | Exchange a Google ID token for access + refresh tokens |
| `POST` | `/api/v1/auth/refresh` | No   | Exchange a refresh token for a new access token        |
| `POST` | `/api/v1/auth/logout`  | No   | Revoke the current refresh token                       |

### Protected Endpoints

All endpoints below require a valid access token in `Authorization: Bearer <access_token>`.

#### Categories

| Method   | Path                        | Description                             |
| -------- | --------------------------- | --------------------------------------- |
| `POST`   | `/api/v1/categories`        | Create a category                       |
| `POST`   | `/api/v1/categories/search` | Search categories with optional filters |
| `PATCH`  | `/api/v1/categories/:id`    | Update a category                       |
| `DELETE` | `/api/v1/categories/:id`    | Delete a category                       |

#### Sources of Income

| Method   | Path                               | Description                          |
| -------- | ---------------------------------- | ------------------------------------ |
| `POST`   | `/api/v1/sources_of_income`        | Create a source of income            |
| `POST`   | `/api/v1/sources_of_income/search` | Search sources with optional filters |
| `PATCH`  | `/api/v1/sources_of_income/:id`    | Update a source of income            |
| `DELETE` | `/api/v1/sources_of_income/:id`    | Delete a source of income            |

#### Payment Methods

| Method   | Path                             | Description             |
| -------- | -------------------------------- | ----------------------- |
| `POST`   | `/api/v1/payment_methods`        | Create a payment method |
| `POST`   | `/api/v1/payment_methods/search` | Search payment methods  |
| `PATCH`  | `/api/v1/payment_methods/:id`    | Update a payment method |
| `DELETE` | `/api/v1/payment_methods/:id`    | Delete a payment method |

#### Expenses

| Method   | Path                      | Description                           |
| -------- | ------------------------- | ------------------------------------- |
| `POST`   | `/api/v1/expenses`        | Create an expense                     |
| `POST`   | `/api/v1/expenses/search` | Search expenses with optional filters |
| `PATCH`  | `/api/v1/expenses/:id`    | Update an expense                     |
| `DELETE` | `/api/v1/expenses/:id`    | Delete an expense                     |

#### Users

| Method   | Path               | Description                |
| -------- | ------------------ | -------------------------- |
| `GET`    | `/api/v1/users/me` | Get the authenticated user |
| `PATCH`  | `/api/v1/users/me` | Update the user's profile  |
| `DELETE` | `/api/v1/users/me` | Delete the user's account  |

### Authentication

**Sign in** by sending a Google ID token to the auth endpoint:

```
POST /api/v1/auth/google
Content-Type: application/json

{ "id_token": "<google_id_token>" }
```

Response: `{ access_token, refresh_token, token_type, access_expires_in, user }`

**Protected requests** attach the access token:

```
Authorization: Bearer <access_token>
```

**Token refresh** when the access token expires:

```
POST /api/v1/auth/refresh
Content-Type: application/json

{ "refresh_token": "<refresh_token>" }
```

**Docs mode** (Swagger UI only): attach `X-Docs-Mode: true` + `X-Api-Key: <API_TOKEN>` — injects a monthly test user automatically, no Google session required.

## Logging

Structured logging via [pino](https://github.com/pinojs/pino). In development, output is pretty-printed; in production, newline-delimited JSON.

| Level   | Used for                                          |
| ------- | ------------------------------------------------- |
| `error` | Unhandled request errors                          |
| `warn`  | Auth failures, DB warnings                        |
| `info`  | Request lifecycle (incoming + completed), DB info |
| `debug` | DB queries (SQL + duration, params redacted)      |

To see DB queries locally:

```bash
LOG_LEVEL=debug bun run dev
```

## Development

### Code Formatting

Uses [Prettier](https://prettier.io/). Formatting runs automatically on every commit via [Husky](https://typicode.github.io/husky/) + lint-staged.

```bash
bun run format        # format all files
bunx prettier --check .  # check without writing
```

**Config (`.prettierrc`):** no semicolons, single quotes, 2-space indent, trailing commas (ES5), 100-char line width.

### Running Tests

```bash
bun test                                        # full suite
bun test src/tests/api/categories.test.ts       # single file
bun test --watch                                # re-run on changes
bun test --bail                                 # stop on first failure
```

**Database tests** connect to your real Supabase database — `DATABASE_URL` must be set.

### Database Migrations

Migrations use both **Prisma** (schema + client generation) and the **Supabase CLI** (applying SQL to the database). The `bun run migrate` command runs both in sequence.

#### Supabase CLI (one-time setup per machine)

```bash
bunx supabase login                                   # authenticate the CLI
bunx supabase link --project-ref vucwsoyaqjufmkmozoqk # link to the Supabase project
```

#### Running a migration

```bash
bunx prisma validate     # validate schema.prisma before migrating
bun run migrate <name>   # generate + apply migration (Prisma + Supabase)
```

`bun run migrate <name>` (see `scripts/migrate.sh`) runs the following under the hood:

```bash
prisma migrate dev --name <name>   # generate SQL, apply to DB, update Prisma's log
supabase migration new <name>      # create a matching file in supabase/migrations/
supabase db push                   # register the migration in Supabase
prisma generate                    # regenerate the Prisma client
```

#### Verifying a migration was deployed

```bash
bun run migrate:check    # fails unless every committed migration is applied to the database
```

`bun run migrate` ends with this check, so a migration that never reached the database fails
the command instead of passing silently. Run it on its own whenever the API returns a 500 on a
table you have just changed.

A committed migration file is not a deployed migration. If the push is skipped or declined at
its prompt, nothing fails at that moment — the break appears later, when code expects a column
the database does not have and every query on that table fails with Prisma `P2022`
(`column does not exist`). CI cannot catch it, because it builds a throwaway database from the
committed history and never connects to the real one.

If the check reports a pending migration that is in fact already applied, register it rather
than re-running it — re-running is only safe for a strictly idempotent migration:

```bash
bunx supabase migration repair --status applied <version>
```

See `prisma/docs/README.md` for the full migration workflow.

### Project Structure

```
src/
├── index.ts               # App entry point, CORS, rate limiting, route groups
├── config/                # DB, logging, OpenAPI, Redis, Google config
├── middleware/            # Auth, cache, error handling
├── constants/             # Static rules (rate limits, IP allowlists)
├── helpers/               # Pagination, filter parsing
├── schemas/               # Zod request body schemas
├── services/              # Business logic (ServiceResult pattern)
├── routes/v1/             # Route handlers grouped by resource
├── types/                 # TypeScript types and TypeBox schemas
└── tests/                 # Integration, unit, security, and stress tests

prisma/
├── schema.prisma          # Prisma ORM schema
├── migrations/            # Migration history (generated)
└── docs/README.md         # Schema reference + migration guide

supabase/
└── migrations/            # Supabase SQL migration files

scripts/
└── migrate.sh             # Combined Prisma + Supabase migration script
```
