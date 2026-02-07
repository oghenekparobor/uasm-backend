-- AlterTable
ALTER TABLE "kitchen_recipes" ADD COLUMN IF NOT EXISTS "ingredients" TEXT;
ALTER TABLE "kitchen_recipes" ADD COLUMN IF NOT EXISTS "instructions" TEXT;
ALTER TABLE "kitchen_recipes" ADD COLUMN IF NOT EXISTS "portion_sizes" TEXT;
ALTER TABLE "kitchen_recipes" ADD COLUMN IF NOT EXISTS "nutritional_info" TEXT;
ALTER TABLE "kitchen_recipes" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "kitchen_recipes" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex (category index moved here so it runs after category column exists)
CREATE INDEX IF NOT EXISTS "kitchen_recipes_category_idx" ON "kitchen_recipes"("category");

