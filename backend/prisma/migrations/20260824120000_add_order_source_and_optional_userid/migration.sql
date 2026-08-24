-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('POS', 'SALES', 'WEBSITE');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'SALES';

ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL;
