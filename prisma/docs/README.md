# Prisma Schema Reference

## Models

### User

Represents a registered user. Created when Clerk fires a `user.created` webhook.

| Column        | Type     | Constraints        | Description                                        |
| ------------- | -------- | ------------------ | -------------------------------------------------- |
| `id`          | `BigInt` | PK, auto-increment | Internal surrogate key                             |
| `external_id` | `String` | UNIQUE, NOT NULL   | Clerk user ID (`data.id` from the webhook payload) |

**Table name:** `users` (mapped via `@@map("users")`)

```prisma
model User {
  id          BigInt @id @default(autoincrement())
  external_id String @unique

  @@map("users")
}
```

---

## Running a Migration Against Supabase

Migrations use both **Prisma** (schema definition + client generation) and the **Supabase CLI** (applying SQL to the database). A single `bun run migrate` command handles both automatically.

### One-time setup per machine

**Log in to Supabase:**

```bash
bunx supabase login
```

**Link to the Supabase project:**

```bash
bunx supabase link --project-ref vucwsoyaqjufmkmozoqk
```

---

### Running a migration

**1. Update `prisma/schema.prisma`** with your new model or field changes.

**2. Validate the schema:**

```bash
bunx prisma validate
```

**3. Run the combined migrate command:**

```bash
bun run migrate <descriptive-name>
```

This single command does everything in sequence:

| Step                                   | What happens                                                        |
| -------------------------------------- | ------------------------------------------------------------------- |
| `prisma migrate dev --name <name>`     | Generates SQL, applies it to the DB, updates Prisma's migration log |
| `supabase migration new <name>`        | Creates a matching timestamped file in `supabase/migrations/`       |
| Copies SQL with `IF NOT EXISTS` guards | Makes the Supabase migration safe to re-run if needed               |
| `supabase db push`                     | Registers the migration in Supabase's tracking table                |

**4. Run the tests to confirm the schema is live:**

```bash
bun test
```

**5. Commit:**

```bash
git add prisma/schema.prisma prisma/migrations src/prisma supabase/migrations
git commit -m "feat(db): <describe the migration>"
```

> Never edit files inside `src/prisma/` or `prisma/migrations/` manually — they are generated artifacts.

---

### Migration history

#### `add_user` — 2026-04-23

Added the `users` table to store Clerk user IDs synced via the `user.created` webhook.

**File:** `supabase/migrations/20260423183504_add_user.sql`

```sql
CREATE TABLE IF NOT EXISTS "users" (
    "id" BIGSERIAL NOT NULL,
    "external_id" TEXT NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_external_id_key" ON "users"("external_id");
```
