-- AlterTable
ALTER TABLE "payment_methods" RENAME COLUMN "bank" TO "origin";
UPDATE "payment_methods" SET "origin" = '' WHERE "origin" IS NULL;
ALTER TABLE "payment_methods" ALTER COLUMN "origin" SET NOT NULL;
