-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_methods" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "source_of_income_categories" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sources_of_income" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;
