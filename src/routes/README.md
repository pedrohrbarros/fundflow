# Routes

All routes are prefixed with `/api/v1` and registered in `src/index.ts` via Elysia's `.group()`.

## Directory Structure

```
routes/
└── v1/
    ├── auth/
    │   ├── index.ts             # Elysia plugin that mounts auth routes
    │   ├── google.ts            # Handler for POST /auth/google (Google ID-token → JWT)
    │   ├── refresh.ts           # Handler for POST /auth/refresh
    │   └── logout.ts            # Handler for POST /auth/logout
    ├── categories/
    │   ├── index.ts             # Elysia plugin for categories routes
    │   ├── create.ts
    │   ├── search.ts
    │   ├── update.ts
    │   └── delete.ts
    ├── sources_of_income/
    │   ├── index.ts             # Elysia plugin for sources of income routes
    │   ├── create.ts
    │   ├── search.ts
    │   ├── update.ts
    │   └── delete.ts
    ├── payment_methods/
    │   ├── index.ts             # Elysia plugin for payment methods routes
    │   ├── create.ts
    │   ├── search.ts
    │   ├── update.ts
    │   └── delete.ts
    ├── expenses/
    │   ├── index.ts             # Elysia plugin for expenses routes
    │   ├── create.ts
    │   ├── search.ts
    │   ├── update.ts
    │   └── delete.ts
    └── users/
        ├── index.ts             # Elysia plugin for users routes
        ├── get_me.ts
        ├── update_country.ts
        └── delete_me.ts
```

## Conventions

### File layout

Each route group is a self-contained folder:

- **`<resource>/index.ts`** — the Elysia plugin that declares route paths, request bodies, response schemas, and wires handlers together.
- **`<resource>/<action>.ts`** — the handler function for a specific action, exported as a named `const`.

### Naming

| What           | Pattern                          | Example                    |
| -------------- | -------------------------------- | -------------------------- |
| Plugin file    | `<resource>/index.ts`            | `payment_methods/index.ts` |
| Handler file   | `<action>.ts`                    | `create.ts`                |
| Handler export | `<action><Resource>` (camelCase) | `createPaymentMethod`      |

### Authentication

There are two authentication strategies, applied at the `.group()` level in `src/index.ts`:

| Strategy  | Middleware     | Used by                                                                   |
| --------- | -------------- | ------------------------------------------------------------------------- |
| User auth | `withUserAuth` | `categories`, `sources_of_income`, `payment_methods`, `expenses`, `users` |

**Protected endpoints** support two modes:

- **Normal mode:** `Authorization: Bearer <access_token>` (backend JWT signed with `JWT_SECRET`)
- **Docs mode** (Swagger UI): `X-Docs-Mode: true` + `X-Api-Key: <API_TOKEN>` — injects a monthly test user automatically

See `src/middleware/README.md` for details.

### Adding a new endpoint

1. Create the handler in `routes/v1/<resource>/<action>.ts`.
2. Import and register it in `routes/v1/<resource>/index.ts` with `requestBody`, `responses`, and `security` detail.
3. Add the corresponding request/response types under `src/types/<resource>/`.
4. Add a Zod schema under `src/schemas/<resource>.ts`.
5. Document the endpoint in the resource's `README.md` and in this file.
6. Register the plugin in the appropriate `.group()` call in `src/index.ts`.

### Caching

Search endpoints are not cached. The filter key space is unbounded, making per-response caching ineffective. All search services query the database directly on every request.

## Current Endpoints

### Auth

| Method | Path                   | Auth | Description                                            |
| ------ | ---------------------- | ---- | ------------------------------------------------------ |
| `POST` | `/api/v1/auth/google`  | No   | Exchange a Google ID token for access + refresh tokens |
| `POST` | `/api/v1/auth/refresh` | No   | Exchange a refresh token for a new access token        |
| `POST` | `/api/v1/auth/logout`  | No   | Revoke the current refresh token                       |

### Categories

| Method   | Path                        | Description                             |
| -------- | --------------------------- | --------------------------------------- |
| `POST`   | `/api/v1/categories`        | Create a new category                   |
| `POST`   | `/api/v1/categories/search` | Search categories with optional filters |
| `PATCH`  | `/api/v1/categories/:id`    | Update a category by id                 |
| `DELETE` | `/api/v1/categories/:id`    | Delete a category by id                 |

### Sources of Income

| Method   | Path                               | Description                                             |
| -------- | ---------------------------------- | ------------------------------------------------------- |
| `POST`   | `/api/v1/sources_of_income`        | Create a new source of income                           |
| `POST`   | `/api/v1/sources_of_income/search` | Search sources with period scoping and optional filters |
| `PATCH`  | `/api/v1/sources_of_income/:id`    | Update a source of income by id                         |
| `DELETE` | `/api/v1/sources_of_income/:id`    | Delete a source of income by id                         |

Search accepts optional `granularity` (`daily|monthly|annually`, default `monthly`) and `date` (`YYYY-MM-DD`, default today) to scope results to a period.

### Payment Methods

| Method   | Path                             | Description                                             |
| -------- | -------------------------------- | ------------------------------------------------------- |
| `POST`   | `/api/v1/payment_methods`        | Create a payment method for the authenticated user      |
| `POST`   | `/api/v1/payment_methods/search` | Search payment methods with optional filters            |
| `PATCH`  | `/api/v1/payment_methods/:id`    | Update a payment method owned by the authenticated user |
| `DELETE` | `/api/v1/payment_methods/:id`    | Delete a payment method owned by the authenticated user |

### Expenses

| Method   | Path                           | Description                                                   |
| -------- | ------------------------------ | ------------------------------------------------------------- |
| `POST`   | `/api/v1/expenses`             | Create an expense for the authenticated user                  |
| `POST`   | `/api/v1/expenses/search`      | Search expenses with period scoping, filters, and pagination  |
| `POST`   | `/api/v1/expenses/by-category` | Summarise period expenses grouped by category (no pagination) |
| `PATCH`  | `/api/v1/expenses/:id`         | Update an expense owned by the authenticated user             |
| `DELETE` | `/api/v1/expenses/:id`         | Delete an expense owned by the authenticated user             |

Search and by-category accept optional `granularity` (`daily|monthly|annually`, default `monthly`) and `date` (`YYYY-MM-DD`, default today) to scope results to a period.

### Users

| Method   | Path               | Description                |
| -------- | ------------------ | -------------------------- |
| `GET`    | `/api/v1/users/me` | Get the authenticated user |
| `PATCH`  | `/api/v1/users/me` | Update the user's profile  |
| `DELETE` | `/api/v1/users/me` | Delete the user's account  |
