-- Fix kitchen_recipes RLS policy to allow kitchen role to create recipes
-- Distribution role should NOT be able to create recipes (they only distribute food)

-- Drop the read-only policy for kitchen role
DROP POLICY IF EXISTS kitchen_recipes_kitchen_read ON kitchen_recipes;

-- Create a new policy that allows kitchen role to INSERT recipes
CREATE POLICY kitchen_recipes_kitchen_insert
ON kitchen_recipes
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'kitchen'
);

-- Create a policy that allows kitchen role to SELECT recipes
CREATE POLICY kitchen_recipes_kitchen_select
ON kitchen_recipes
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'kitchen'
);

-- Create a policy that allows kitchen role to UPDATE recipes
CREATE POLICY kitchen_recipes_kitchen_update
ON kitchen_recipes
FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'kitchen'
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'kitchen'
);

-- Note: Distribution role has NO policy, so they cannot create/update recipes
-- They can only read recipes if there's a SELECT policy that allows it
-- Currently, distribution role cannot read recipes either (which is correct - they distribute, not cook)

