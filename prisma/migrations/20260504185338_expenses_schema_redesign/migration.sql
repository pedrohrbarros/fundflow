/*
  Warnings:

  - You are about to drop the `user_sources_of_income` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updated_at` to the `payment_methods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `source_of_income_categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `source_of_income_categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `sources_of_income` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `sources_of_income` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "user_sources_of_income" DROP CONSTRAINT "user_sources_of_income_source_of_income_id_fkey";

-- DropForeignKey
ALTER TABLE "user_sources_of_income" DROP CONSTRAINT "user_sources_of_income_user_id_fkey";

-- AlterTable: users — add timestamps with DEFAULT so existing rows get values
ALTER TABLE "users" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: payment_methods — add timestamps with DEFAULT
ALTER TABLE "payment_methods" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: source_of_income_categories — add timestamps + user_id (nullable first for backfill)
ALTER TABLE "source_of_income_categories"
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_id" BIGINT;

-- Backfill user_id for existing categories using the first user; delete orphans if no users exist
UPDATE "source_of_income_categories" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "id" LIMIT 1)
WHERE "user_id" IS NULL AND EXISTS (SELECT 1 FROM "users");
DELETE FROM "source_of_income_categories" WHERE "user_id" IS NULL;

ALTER TABLE "source_of_income_categories" ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable: sources_of_income — add timestamps + user_id (nullable first for backfill)
ALTER TABLE "sources_of_income"
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_id" BIGINT;

-- Backfill user_id for existing sources using the first user; delete orphans if no users exist
UPDATE "sources_of_income" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "id" LIMIT 1)
WHERE "user_id" IS NULL AND EXISTS (SELECT 1 FROM "users");
DELETE FROM "sources_of_income" WHERE "user_id" IS NULL;

ALTER TABLE "sources_of_income" ALTER COLUMN "user_id" SET NOT NULL;

-- DropTable
DROP TABLE "user_sources_of_income";

-- CreateTable
CREATE TABLE "expenses" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "is_saved" BOOLEAN NOT NULL DEFAULT false,
    "saving_location" TEXT,
    "user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_payment_methods" (
    "expense_id" BIGINT NOT NULL,
    "payment_method_id" BIGINT NOT NULL,
    "partial_amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_payment_methods_pkey" PRIMARY KEY ("expense_id","payment_method_id")
);

-- AddForeignKey
ALTER TABLE "source_of_income_categories" ADD CONSTRAINT "source_of_income_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources_of_income" ADD CONSTRAINT "sources_of_income_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payment_methods" ADD CONSTRAINT "expense_payment_methods_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payment_methods" ADD CONSTRAINT "expense_payment_methods_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
