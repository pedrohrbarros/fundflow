# Fundflow

A lightweight financial monitoring API that tracks a user's financial state and monthly spending. Built with [Elysia](https://elysiajs.com/) on the [Bun](https://bun.sh/) runtime.

## Tech Stack

- **Runtime:** Bun
- **Framework:** Elysia
- **Language:** TypeScript
- **Database:** PostgreSQL via [Supabase](https://supabase.com/) + [Prisma 7](https://www.prisma.io/)
- **Cache:** Redis
- **Documentation:** OpenAPI 3.0 / ReDoc

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+

### Installation

```bash
bun install
```

### Environment Variables

Create a `.env` file in the project root:

```env
API_KEY=your_secret_key
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://localhost:6379
```

| Variable       | Required | Description                                     |
|----------------|----------|-------------------------------------------------|
| `API_KEY`      | Yes      | Bearer token used to authenticate API requests |
| `DATABASE_URL` | Yes      | PostgreSQL connection string (Supabase)        |
| `REDIS_URL`    | Yes      | Redis connection string                        |

### Running the Server

```bash
bun run dev
```

Server starts at `http://localhost:3000`.

## API Reference

Interactive documentation is available at `http://localhost:3000/docs` (ReDoc UI).

### Endpoints

| Method | Path            | Auth | Description                       |
|--------|-----------------|------|-----------------------------------|
| `GET`  | `/`             | No   | Health check                      |
| `GET`  | `/openapi/json` | No   | OpenAPI 3.0 specification (JSON) |
| `GET`  | `/docs`         | No   | Interactive API documentation     |

### Authentication

Protected routes use Bearer token authentication. Include the `API_KEY` value from your `.env` in the `Authorization` header:

```
Authorization: Bearer <API_KEY>
```

To protect a route, add `requireAuth` as a `beforeHandle` hook:

```typescript
import { requireAuth } from './middleware/auth'

app.get('/protected', handler, { beforeHandle: requireAuth })
```

## Development

### Running Tests

```bash
bun test
```

### Project Structure

```
src/
├── index.ts                  # App entry point
├── config/
│   ├── openapi.ts            # OpenAPI metadata and security schemes
│   └── redis.ts              # Redis client
├── middleware/
│   └── auth.ts               # Bearer token authentication middleware
└── tests/
    ├── api/
    │   └── index.test.ts     # Integration tests for API endpoints
    ├── db/
    │   └── client.test.ts    # Prisma client tests
    └── middleware/
        └── auth.test.ts      # Unit tests for auth middleware

prisma/
└── schema.prisma             # Prisma schema (PostgreSQL / Supabase)
```
