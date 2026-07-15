/*
  Warnings:

  - You are about to drop the column `roleId` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_roleId_fkey";

-- DropIndex
DROP INDEX "users_roleId_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "roleId",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';
