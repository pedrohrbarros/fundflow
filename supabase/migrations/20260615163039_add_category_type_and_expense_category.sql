-- Add CategoryType enum, a required type discriminator on categories
-- (table kept as source_of_income_categories), and a required category on expenses.
-- Guarded so it is safe to re-run via supabase db push.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CategoryType') THEN
    CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');
  END IF;
END $$;

ALTER TABLE "source_of_income_categories" ADD COLUMN IF NOT EXISTS "type" "CategoryType";
UPDATE "source_of_income_categories" SET "type" = 'INCOME' WHERE "type" IS NULL;
ALTER TABLE "source_of_income_categories" ALTER COLUMN "type" SET NOT NULL;

ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "category_id" BIGINT;
ALTER TABLE "expenses" ALTER COLUMN "category_id" SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_category_id_fkey') THEN
    ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "source_of_income_categories"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
