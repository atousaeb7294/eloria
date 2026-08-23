/*
  Warnings:

  - You are about to alter the column `title` on the `customer_addresses` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(80)`.
  - You are about to drop the column `emailVerifiedAt` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `failedLoginAttempts` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `lockedUntil` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the `customer_password_reset_challenges` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "customer_password_reset_challenges" DROP CONSTRAINT "customer_password_reset_challenges_customerId_fkey";

-- DropIndex
DROP INDEX "customer_sessions_expiresAt_idx";

-- DropIndex
DROP INDEX "customers_email_key";

-- DropIndex
DROP INDEX "customers_lockedUntil_idx";

-- AlterTable
ALTER TABLE "content_articles" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "customer_addresses" ALTER COLUMN "title" SET DEFAULT 'آدرس من',
ALTER COLUMN "title" SET DATA TYPE VARCHAR(80);

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "emailVerifiedAt",
DROP COLUMN "failedLoginAttempts",
DROP COLUMN "lockedUntil",
DROP COLUMN "passwordHash";

-- AlterTable
ALTER TABLE "finance_expenses" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "customer_password_reset_challenges";
