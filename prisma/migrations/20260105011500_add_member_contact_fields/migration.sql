-- AlterTable
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "emergency_contact" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "members_phone_idx" ON "members"("phone");
CREATE INDEX IF NOT EXISTS "members_email_idx" ON "members"("email");

