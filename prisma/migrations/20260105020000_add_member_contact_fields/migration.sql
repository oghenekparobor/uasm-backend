-- AlterTable
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "emergency_contact" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "members" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "members_phone_idx" ON "members"("phone");
CREATE INDEX IF NOT EXISTS "members_email_idx" ON "members"("email");

