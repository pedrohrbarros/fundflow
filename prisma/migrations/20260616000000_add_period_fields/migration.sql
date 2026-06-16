ALTER TABLE "expenses" ADD COLUMN "date" DATE;
UPDATE "expenses" SET "date" = ("created_at" AT TIME ZONE 'UTC')::date WHERE "date" IS NULL;
ALTER TABLE "expenses" ALTER COLUMN "date" SET NOT NULL;
ALTER TABLE "expenses" ADD COLUMN "is_recurring" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "sources_of_income" ADD COLUMN "date" DATE;
UPDATE "sources_of_income" SET "date" = ("created_at" AT TIME ZONE 'UTC')::date WHERE "date" IS NULL;
ALTER TABLE "sources_of_income" ALTER COLUMN "date" SET NOT NULL;
ALTER TABLE "sources_of_income" ADD COLUMN "is_recurring" BOOLEAN NOT NULL DEFAULT false;
