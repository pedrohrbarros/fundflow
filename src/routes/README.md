# Routes

All routes are prefixed with `/api/v1` and registered in `src/index.ts` via Elysia's `.group()`.

## Directory Structure

```
routes/
└── v1/
    ├── webhooks/
    │   ├── index.ts             # Elysia plugin that mounts all webhook routes
    │   └── clerk/
    │       ├── register.ts      # Handler for Clerk user.created webhook
    │       └── delete.ts        # Handler for Clerk user.deleted webhook
    ├── categories/
    │   ├── index.ts             # Elysia plugin for categories routes
    │   ├── create.ts
    │   ├── list.ts
    │   ├── update.ts
    │   └── delete.ts
    ├── sources_of_income/
    │   ├── index.ts             # Elysia plugin for sources of income routes
    │   ├── create.ts
    │   ├── list.ts
    │   ├── update.ts
    │   └── delete.ts
    ├── payment_methods/
    │   ├── index.ts             # Elysia plugin for payment methods routes
    │   ├── create.ts
    │   ├── list.ts
    │   ├── update.ts
    │   └── delete.ts
    └── expenses/
        ├── index.ts             # Elysia plugin for expenses routes
        ├── create.ts
        ├── list.ts
        ├── update.ts
        └── delete.ts
```

## Conventions

### File layout

Each route group is a self-contained folder:

- **`<resource>/index.ts`** — the Elysia plugin that declares the route paths and wires handlers together.
- **`<resource>/<action>.ts`** — the handler function for a specific action, exported as a named `const`.

### Naming

| What           | Pattern                          | Example               |
| -------------- | -------------------------------- | --------------------- |
| Plugin file    | `<resource>/index.ts`            | `payment_methods/index.ts` |
| Handler file   | `<action>.ts`                    | `create.ts`           |
| Handler export | `<action><Resource>` (camelCase) | `createPaymentMethod` |

### Route paths

Standard resource routes follow the shape:

```
/<resource>
/<resource>/:id
```

Webhook routes follow:

```
/webhooks/<provider>/<event>/listener
```

### Authentication

There are two authentication strategies, applied at the `.group()` level in `src/index.ts`:

| Strategy                  | Middleware                 | Used by                                                              |
| ------------------------- | -------------------------- | -------------------------------------------------------------------- |
| Bearer token only         | `withBearerAuth`           | `webhooks`                                                           |
| Clerk JWT + Bearer token  | `withClerkAndBearerAuth`   | `categories`, `sources_of_income`, `payment_methods`, `expenses`     |

**Webhook endpoints** (`/api/v1/webhooks/**`) require only a static Bearer token in the `Authorization` header:

```
Authorization: Bearer <API_TOKEN>
```

**All other endpoints** require both:

1. A valid Clerk JWT in the `Authorization` header:
   ```
   Authorization: Bearer <CLERK_JWT>
   ```
2. The static API token in the `X-Api-Key` header:
   ```
   X-Api-Key: <API_TOKEN>
   ```

Both headers must be present and valid. If either check fails, the server responds with `401 Unauthorized`.

Handlers on Clerk-authenticated routes receive `clerk_user_id: string` in their context, injected by the middleware derive step.

### Adding a new endpoint

1. Create the handler in `routes/v1/<resource>/<action>.ts`.
2. Import and register it in `routes/v1/<resource>/index.ts`.
3. Add the corresponding request/response types under `src/types/<resource>/`.
4. Document the endpoint in this README.
5. Register the plugin in the appropriate `.group()` call in `src/index.ts` — use `withClerkAndBearerAuth` for user-facing resources, `withBearerAuth` for webhooks.

### Caching

List endpoints on non-webhook resources are cached in Redis using read-through caching. The cache is invalidated immediately after any successful mutation (create, update, delete) on the same resource. A 5-minute TTL acts as a safety backstop.

Cache helpers live in `src/middleware/cache.ts` (`cacheGet`, `cacheSet`, `cacheDel`). Caching logic is applied at the service layer — route handlers are unchanged.

All cache keys are scoped per user using the Clerk user ID (`clerk_user_id`):

| Endpoint                        | Cache key                                    |
| ------------------------------- | -------------------------------------------- |
| `GET /api/v1/categories`            | `categories:list:{clerk_user_id}`            |
| `GET /api/v1/sources_of_income`     | `sources_of_income:list:{clerk_user_id}`     |
| `GET /api/v1/payment_methods`       | `payment_methods:list:{clerk_user_id}`       |

When adding a new cacheable resource, follow the pattern in `src/services/categories.ts` and document the cache key in this table.

## Current Endpoints

### Webhooks

| Method | Path                          | Auth         | Description                                              |
| ------ | ----------------------------- | ------------ | -------------------------------------------------------- |
| `POST` | `/api/v1/webhooks/clerk/register` | Bearer token | Creates a user record from a Clerk `user.created` event  |
| `POST` | `/api/v1/webhooks/clerk/delete`   | Bearer token | Deletes a user record from a Clerk `user.deleted` event  |

Both webhook endpoints additionally verify the Svix signature and enforce Clerk's IP allowlist.

### Categories

| Method   | Path                  | Auth                      | Description               |
| -------- | --------------------- | ------------------------- | ------------------------- |
| `POST`   | `/api/v1/categories`      | Clerk JWT + Bearer token  | Create a new category     |
| `GET`    | `/api/v1/categories`      | Clerk JWT + Bearer token  | List all categories       |
| `PATCH`  | `/api/v1/categories/:id`  | Clerk JWT + Bearer token  | Update a category by id   |
| `DELETE` | `/api/v1/categories/:id`  | Clerk JWT + Bearer token  | Delete a category by id   |

### Sources of Income

| Method   | Path                        | Auth                      | Description                        |
| -------- | --------------------------- | ------------------------- | ---------------------------------- |
| `POST`   | `/api/v1/sources_of_income`     | Clerk JWT + Bearer token  | Create a new source of income      |
| `GET`    | `/api/v1/sources_of_income`     | Clerk JWT + Bearer token  | List all sources of income         |
| `PATCH`  | `/api/v1/sources_of_income/:id` | Clerk JWT + Bearer token  | Update a source of income by id    |
| `DELETE` | `/api/v1/sources_of_income/:id` | Clerk JWT + Bearer token  | Delete a source of income by id    |

### Payment Methods

| Method   | Path                       | Auth                      | Description                                              |
| -------- | -------------------------- | ------------------------- | -------------------------------------------------------- |
| `POST`   | `/api/v1/payment_methods`      | Clerk JWT + Bearer token  | Create a payment method for the authenticated user       |
| `GET`    | `/api/v1/payment_methods`      | Clerk JWT + Bearer token  | List all payment methods for the authenticated user      |
| `PATCH`  | `/api/v1/payment_methods/:id`  | Clerk JWT + Bearer token  | Update a payment method owned by the authenticated user  |
| `DELETE` | `/api/v1/payment_methods/:id`  | Clerk JWT + Bearer token  | Delete a payment method owned by the authenticated user  |

### Expenses

| Method   | Path                  | Auth                      | Description                                        |
| -------- | --------------------- | ------------------------- | -------------------------------------------------- |
| `POST`   | `/api/v1/expenses`        | Clerk JWT + Bearer token  | Create an expense for the authenticated user       |
| `GET`    | `/api/v1/expenses`        | Clerk JWT + Bearer token  | List expenses for the authenticated user (paginated) |
| `PATCH`  | `/api/v1/expenses/:id`    | Clerk JWT + Bearer token  | Update an expense owned by the authenticated user  |
| `DELETE` | `/api/v1/expenses/:id`    | Clerk JWT + Bearer token  | Delete an expense owned by the authenticated user  |
