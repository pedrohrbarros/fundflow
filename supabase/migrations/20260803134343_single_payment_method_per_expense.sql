-- Expenses reference at most one payment method, with no per-method amount.
-- Written idempotently so it is safe to re-run through the additive
-- prisma -> supabase pipeline (see scripts/migrate.sh).

ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "payment_method_id" BIGINT;

-- Carry over the existing splits. No expense had more than one method, so MIN
-- just picks the single row; it also keeps this deterministic if one ever did.
UPDATE "expenses" e
   SET "payment_method_id" = epm."payment_method_id"
  FROM (
    SELECT "expense_id", MIN("payment_method_id") AS "payment_method_id"
      FROM "expense_payment_methods"
     GROUP BY "expense_id"
  ) epm
 WHERE epm."expense_id" = e."id" AND e."payment_method_id" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_payment_method_id_fkey'
  ) THEN
    ALTER TABLE "expenses"
      ADD CONSTRAINT "expenses_payment_method_id_fkey"
      FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DROP TABLE IF EXISTS "expense_payment_methods";

ALTER TABLE "payment_methods" DROP COLUMN IF EXISTS "receiver";
