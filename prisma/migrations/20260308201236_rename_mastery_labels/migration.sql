/*
  Warnings:

  - The values [EXPOSED,SCANNING,HARDENED,CLASSIFIED] on the enum `Mastery` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Mastery_new" AS ENUM ('NOT_STARTED', 'LEARNING', 'PROFICIENT', 'MASTERED');
ALTER TABLE "public"."Topic" ALTER COLUMN "mastery" DROP DEFAULT;
ALTER TABLE "Topic" ALTER COLUMN "mastery" TYPE "Mastery_new" USING ("mastery"::text::"Mastery_new");
ALTER TYPE "Mastery" RENAME TO "Mastery_old";
ALTER TYPE "Mastery_new" RENAME TO "Mastery";
DROP TYPE "public"."Mastery_old";
ALTER TABLE "Topic" ALTER COLUMN "mastery" SET DEFAULT 'NOT_STARTED';
COMMIT;

-- AlterTable
ALTER TABLE "Topic" ALTER COLUMN "mastery" SET DEFAULT 'NOT_STARTED';
