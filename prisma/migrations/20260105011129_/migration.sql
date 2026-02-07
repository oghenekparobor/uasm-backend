-- No-op: kitchen_recipes.updated_at/category and members.updated_at are added in later migrations.
-- DROP DEFAULT for members.updated_at is applied in 20260105020000 after the column is added.
-- Category index for kitchen_recipes is applied in 20260105030000.
SELECT 1;
