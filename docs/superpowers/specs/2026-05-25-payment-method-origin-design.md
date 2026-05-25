# Payment Method `origin` Field — Design Spec

**Date:** 2026-05-25  
**Branch:** `feature/payment-method-bank`  
**Status:** Approved

---

## Problem

An expense can be split across multiple payment methods. Currently, two payment methods of the same `name` (e.g. two Credit Cards) cannot be distinguished by their institutional source. The `bank` field was added for this purpose but is optional, nullable, and inconsistently named. We need a mandatory, well-named field that unambiguously identifies where each payment method originates.

**Example:**
```
Payment Method: Credit Card  →  Origin: Inter Bank
Payment Method: Credit Card  →  Origin: Nubank
```
Both can be used in the same expense because they are distinct records with different `origin` values.

---

## Decision

Replace the optional `bank String?` field with a mandatory `origin String` field on the `PaymentMethod` model.

- **`origin` is required on create** — every payment method must declare its source.
- **`origin` cannot be set to null on update** — it can be changed but not cleared.
- **`origin` is free text** — no enum constraint; examples: `"Inter Bank"`, `"Nubank"`, `"PayPal"`, `"Apple Pay"`.

---

## Architecture

### 1. Database & Prisma Schema

File: `prisma/schema.prisma`

```prisma
model PaymentMethod {
  id         BigInt                 @id @default(autoincrement())
  name       String
  origin     String                 // replaces bank — mandatory
  receiver   String?
  user_id    BigInt
  user       User                   @relation(fields: [user_id], references: [id])
  expenses   ExpensePaymentMethod[]
  created_at DateTime               @default(now())
  updated_at DateTime               @updatedAt

  @@map("payment_methods")
}
```

**Migration strategy (Approach A):**  
Prisma generates a migration that renames `bank` → `origin` and adds a NOT NULL constraint. Because the existing column is nullable, any rows with `NULL` bank values must be given a value before the constraint is applied. In the generated migration SQL, this is handled by setting a temporary default (e.g. `''`) for the `ALTER COLUMN` step. This is safe in the dev environment; the column has no production data.

After running the migration, `prisma generate` regenerates the Prisma client. The generated model files under `src/prisma/` are regenerated automatically — they must not be edited manually (they are marked `@generated`).

---

### 2. Types & Validation

#### `src/types/payment_methods/index.ts`

| Field | Before | After |
|---|---|---|
| `PaymentMethodRecord.bank` | `string \| null` | removed |
| `PaymentMethodRecord.origin` | — | `string` (required) |
| `PaymentMethodCreateBody.bank` | `t.Optional(t.String(...))` | removed |
| `PaymentMethodCreateBody.origin` | — | `t.String({ minLength: 1 })` (required) |
| `PaymentMethodUpdateBody.bank` | `t.Optional(...)` | removed |
| `PaymentMethodUpdateBody.origin` | — | `t.Optional(t.String({ minLength: 1 }))` |

#### `src/schemas/payment_methods.ts` (Zod)

| Schema | Field change |
|---|---|
| `PaymentMethodCreateSchema` | `bank?: z.string().min(1)` → `origin: z.string().min(1)` |
| `PaymentMethodUpdateSchema` | `bank?: z.union([...])` → `origin?: z.string().min(1)` |

`origin` on update is an optional string (non-empty if provided). It cannot be set to `null` since `origin` is a mandatory property of the record.

---

### 3. Service Layer

File: `src/services/payment_methods.ts`

**`create` method:**
```ts
async create(
  user_external_id: string,
  name: string,
  origin: string,       // was: bank?: string
  receiver?: string
): Promise<ServiceResult<PaymentMethodRecord>>
```
- DB call: `data: { name, origin, receiver: receiver ?? null, user_id: user.id }`
- Return mapping: `origin: payment_method.origin`

**`update` method:**
```ts
async update(
  id: bigint,
  user_external_id: string,
  data: { name?: string; origin?: string; receiver?: string | null }
): Promise<ServiceResult<PaymentMethodRecord>>
```
- Return mapping: `origin: payment_method.origin`

**`listForUser` method:**
- Return mapping: `bank: pm.bank` → `origin: pm.origin`

---

### 4. Route Handlers

**`src/routes/v1/payment_methods/create.ts`**  
Passes `parsed.data.origin` (required) to `PaymentMethodsService.create` instead of `parsed.data.bank`.

**`src/routes/v1/payment_methods/update.ts`**  
Builds the update data object with `origin` instead of `bank`. `origin` is set only when present in the parsed body; it is never set to `null`.

No new endpoints. The existing `POST /api/v1/payment_methods` and `PATCH /api/v1/payment_methods/:id` endpoints gain/change the `origin` field.

---

### 5. Tests

**`src/tests/api/payment_methods.test.ts`**

| Test | Change |
|---|---|
| `POST creates a payment method` | Body includes `origin: 'Inter Bank'`; assert `json.origin === 'Inter Bank'` |
| `POST without origin returns 400` | New test: omit `origin` from body, expect `400` |
| `GET returns list` | Assert listed payment method includes `origin` field |
| `PATCH updates a payment method` | Add assertion for updating `origin`; update fixture to include `origin` on create |
| `PATCH returns 404` | Update create fixture to include `origin` |
| `DELETE deletes a payment method` | Update create fixture to include `origin` |
| `DELETE returns 404` | No change needed (no create in this test) |

**`src/tests/cache/payment_methods.test.ts`**

All `POST` requests in this file create payment methods without `origin` (e.g. `{ name: 'Test Bank' }`). Since `origin` is now mandatory, every create fixture in this file must include `origin`. Update all four test bodies to add `origin: 'Test Bank'` (or any non-empty string).

---

## Error Handling

- `POST /api/v1/payment_methods` without `origin` → `400` with Zod field error on `origin`.
- `PATCH /api/v1/payment_methods/:id` with `origin: ""` → `400` (minLength: 1 enforced by Zod).
- `PATCH /api/v1/payment_methods/:id` with `origin: null` → `400` (null not accepted by schema).

---

## Out of Scope

- No uniqueness constraint on `(user_id, name, origin)` — users may create duplicate-looking payment methods; that is their choice.
- No changes to `ExpensePaymentMethod` — `origin` lives on `PaymentMethod`, not on the expense relationship.
- No changes to other models (Expense, SourceOfIncome, etc.).
