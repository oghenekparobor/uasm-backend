-- AlterTable
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "occupation" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "age" INTEGER;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "gender" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "members_status_idx" ON "members"("status");
