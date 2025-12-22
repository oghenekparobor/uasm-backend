-- =========================================================
-- RLS policies for UAMS
-- =========================================================

-- Common helpers (comments only, for reference)
-- role        := (current_setting('request.jwt.claims', true)::json->>'role')
-- user_id     := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
-- platoon_ids := json_array_elements_text(
--                  current_setting('request.jwt.claims', true)::json->'platoon_ids'
--                )::uuid


-- =========================
-- users
-- =========================

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Policy: super_admin and admin have full access to users
CREATE POLICY users_admin_full
ON "users"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('super_admin', 'admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('super_admin', 'admin')
);

CREATE POLICY users_self_select
ON "users"
FOR SELECT
USING (
  id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
);

CREATE POLICY users_self_update
ON "users"
FOR UPDATE
USING (
  id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
)
WITH CHECK (
  id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
);


-- =========================
-- roles
-- =========================

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;

-- Policy: super_admin has full control over roles
CREATE POLICY roles_super_admin_full
ON "roles"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'super_admin'
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'super_admin'
);

-- Policy: admin can read roles
CREATE POLICY roles_admin_read
ON "roles"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);


-- =========================
-- user_roles
-- =========================

ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;

-- Policy: super_admin has full control over user_roles
CREATE POLICY user_roles_super_admin_full
ON "user_roles"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'super_admin'
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'super_admin'
);

-- Policy: admin can assign and read user roles (no delete of super_admin at app level)
CREATE POLICY user_roles_admin_select
ON "user_roles"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

CREATE POLICY user_roles_admin_insert
ON "user_roles"
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

CREATE POLICY user_roles_admin_update
ON "user_roles"
FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);


-- =========================
-- classes
-- =========================

ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;

-- Policy: super_admin and admin have full access to classes
CREATE POLICY classes_admin_full
ON "classes"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('super_admin', 'admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('super_admin', 'admin')
);

-- Policy: leaders/teachers can read only assigned classes
CREATE POLICY classes_leaders_read_assigned
ON "classes"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "class_leaders" cl
    WHERE cl.class_id = "classes".id
      AND cl.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
  )
);


-- =========================
-- class_leaders
-- =========================

ALTER TABLE "class_leaders" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin manage class_leaders
CREATE POLICY class_leaders_admin_full
ON "class_leaders"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('super_admin', 'admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('super_admin', 'admin')
);

-- Policy: leaders/teachers can read their own leadership assignments
CREATE POLICY class_leaders_self_read
ON "class_leaders"
FOR SELECT
USING (
  user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
);


-- =========================
-- members
-- =========================

ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to members
CREATE POLICY members_admin_full
ON "members"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('super_admin', 'admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('super_admin', 'admin')
);

-- Policy: leaders/teachers can access members in their platoons/classes
CREATE POLICY members_leaders_select
ON "members"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM json_array_elements_text(
      current_setting('request.jwt.claims', true)::json->'platoon_ids'
    ) AS pid(value)
    WHERE pid.value::uuid = "members".current_class_id
  )
);

CLEAR POLICY members_leaders_insert_update
ON "members";

CREATE POLICY members_leaders_insert
ON "members"
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM json_array_elements_text(
      current_setting('request.jwt.claims', true)::json->'platoon_ids'
    ) AS pid(value)
    WHERE pid.value::uuid = "members".current_class_id
  )
);

CREATE POLICY members_leaders_update
ON "members"
FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM json_array_elements_text(
      current_setting('request.jwt.claims', true)::json->'platoon_ids'
    ) AS pid(value)
    WHERE pid.value::uuid = "members".current_class_id
  )
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM json_array_elements_text(
      current_setting('request.jwt.claims', true)::json->'platoon_ids'
    ) AS pid(value)
    WHERE pid.value::uuid = "members".current_class_id
  )
);

-- Policy: distribution role can read members (read-only) for distribution context
CREATE POLICY members_distribution_read
ON "members"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'distribution'
);


-- =========================
-- member_class_history
-- =========================

ALTER TABLE "member_class_history" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to member_class_history
CREATE POLICY member_history_admin_full
ON "member_class_history"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('super_admin', 'admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('super_admin', 'admin')
);

-- Policy: leaders/teachers can read transfer history for their members
CREATE POLICY member_history_leaders_read
ON "member_class_history"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM "members" m
    WHERE m.id = "member_class_history".member_id
      AND EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          current_setting('request.jwt.claims', true)::json->'platoon_ids'
        ) AS pid(value)
        WHERE pid.value::uuid = m.current_class_id
      )
  )
);

-- Policy: distribution role can read transfer history for all members
CREATE POLICY member_history_distribution_read
ON "member_class_history"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'distribution'
);


-- =========================
-- attendance_windows
-- =========================

ALTER TABLE "attendance_windows" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to attendance windows
CREATE POLICY attendance_windows_admin_full
ON "attendance_windows"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: distribution role and leaders can read attendance windows
CREATE POLICY attendance_windows_read_roles
ON "attendance_windows"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'distribution',
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
);


-- =========================
-- class_attendance
-- =========================

ALTER TABLE "class_attendance" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to class_attendance
CREATE POLICY class_attendance_admin_full
ON "class_attendance"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: leaders/teachers can insert and read attendance only for their classes
CREATE POLICY class_attendance_leaders_select
ON "class_attendance"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM json_array_elements_text(
      current_setting('request.jwt.claims', true)::json->'platoon_ids'
    ) AS pid(value)
    WHERE pid.value::uuid = "class_attendance".class_id
  )
);

CREATE POLICY class_attendance_leaders_insert
ON "class_attendance"
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM json_array_elements_text(
      current_setting('request.jwt.claims', true)::json->'platoon_ids'
    ) AS pid(value)
    WHERE pid.value::uuid = "class_attendance".class_id
  )
);

CREATE POLICY class_attendance_leaders_update
ON "class_attendance"
FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM json_array_elements_text(
      current_setting('request.jwt.claims', true)::json->'platoon_ids'
    ) AS pid(value)
    WHERE pid.value::uuid = "class_attendance".class_id
  )
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM json_array_elements_text(
      current_setting('request.jwt.claims', true)::json->'platoon_ids'
    ) AS pid(value)
    WHERE pid.value::uuid = "class_attendance".class_id
  )
);

-- Policy: distribution role has no direct access to raw attendance (aggregates via views only)
-- (No SELECT policy for role = 'distribution')


-- =========================
-- kitchen_recipes
-- =========================

ALTER TABLE "kitchen_recipes" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to kitchen_recipes
CREATE POLICY kitchen_recipes_admin_full
ON "kitchen_recipes"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: kitchen role can create recipes
CREATE POLICY kitchen_recipes_kitchen_insert
ON "kitchen_recipes"
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'kitchen'
);

-- Policy: kitchen role can read recipes
CREATE POLICY kitchen_recipes_kitchen_select
ON "kitchen_recipes"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'kitchen'
);

-- Policy: kitchen role can update recipes
CREATE POLICY kitchen_recipes_kitchen_update
ON "kitchen_recipes"
FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'kitchen'
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'kitchen'
);

-- Note: Distribution role has NO policy for kitchen_recipes
-- They cannot create, read, or update recipes (they only distribute food, not cook)


-- =========================
-- kitchen_production_logs
-- =========================

ALTER TABLE "kitchen_production_logs" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to kitchen_production_logs
CREATE POLICY kitchen_logs_admin_full
ON "kitchen_production_logs"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: kitchen role can create and read their own production logs
CREATE POLICY kitchen_logs_kitchen_select
ON "kitchen_production_logs"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'kitchen'
  AND logged_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
);

CREATE POLICY kitchen_logs_kitchen_insert
ON "kitchen_production_logs"
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'kitchen'
  AND logged_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
);

CREATE POLICY kitchen_logs_kitchen_update
ON "kitchen_production_logs"
FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'kitchen'
  AND logged_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'kitchen'
  AND logged_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
);


-- =========================
-- distribution_batches
-- =========================

ALTER TABLE "distribution_batches" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to distribution_batches
CREATE POLICY distribution_batches_admin_full
ON "distribution_batches"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: distribution role can manage distribution batches
CREATE POLICY distribution_batches_distribution_select
ON "distribution_batches"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'distribution'
);

CREATE POLICY distribution_batches_distribution_insert
ON "distribution_batches"
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'distribution'
);

CREATE POLICY distribution_batches_distribution_update
ON "distribution_batches"
FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'distribution'
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'distribution'
);


-- =========================
-- class_distributions
-- =========================

ALTER TABLE "class_distributions" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to class_distributions
CREATE POLICY class_distributions_admin_full
ON "class_distributions"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: distribution role can manage all class distributions
CREATE POLICY class_distributions_distribution_select
ON "class_distributions"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'distribution'
);

CREATE POLICY class_distributions_distribution_insert
ON "class_distributions"
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'distribution'
);

CREATE POLICY class_distributions_distribution_update
ON "class_distributions"
FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'distribution'
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'distribution'
);

-- Policy: leaders can read class_distributions for their platoons/classes
CREATE POLICY class_distributions_leaders_read
ON "class_distributions"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM json_array_elements_text(
      current_setting('request.jwt.claims', true)::json->'platoon_ids'
    ) AS pid(value)
    WHERE pid.value::uuid = "class_distributions".class_id
  )
);


-- =========================
-- empowerment_requests
-- =========================

ALTER TABLE "empowerment_requests" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to empowerment_requests
CREATE POLICY empowerment_admin_full
ON "empowerment_requests"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: leaders/teachers can create and read empowerment for their members
CREATE POLICY empowerment_leaders_select
ON "empowerment_requests"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM "members" m
    WHERE m.id = "empowerment_requests".member_id
      AND EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          current_setting('request.jwt.claims', true)::json->'platoon_ids'
        ) AS pid(value)
        WHERE pid.value::uuid = m.current_class_id
      )
  )
);

CREATE POLICY empowerment_leaders_insert
ON "empowerment_requests"
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND requested_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
  AND EXISTS (
    SELECT 1
    FROM "members" m
    WHERE m.id = "empowerment_requests".member_id
      AND EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          current_setting('request.jwt.claims', true)::json->'platoon_ids'
        ) AS pid(value)
        WHERE pid.value::uuid = m.current_class_id
      )
  )
);

-- Policy: only admin/super_admin can update approval status
CREATE POLICY empowerment_admin_update_only
ON "empowerment_requests"
FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);


-- =========================
-- member_logs
-- =========================

ALTER TABLE "member_logs" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to member_logs
CREATE POLICY member_logs_admin_full
ON "member_logs"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: leaders/teachers can manage logs for their members
CREATE POLICY member_logs_leaders_select
ON "member_logs"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM "members" m
    WHERE m.id = "member_logs".member_id
      AND EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          current_setting('request.jwt.claims', true)::json->'platoon_ids'
        ) AS pid(value)
        WHERE pid.value::uuid = m.current_class_id
      )
  )
);

CREATE POLICY member_logs_leaders_insert
ON "member_logs"
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND created_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
  AND EXISTS (
    SELECT 1
    FROM "members" m
    WHERE m.id = "member_logs".member_id
      AND EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          current_setting('request.jwt.claims', true)::json->'platoon_ids'
        ) AS pid(value)
        WHERE pid.value::uuid = m.current_class_id
      )
  )
);

CREATE POLICY member_logs_leaders_update
ON "member_logs"
FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND EXISTS (
    SELECT 1
    FROM "members" m
    WHERE m.id = "member_logs".member_id
      AND EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          current_setting('request.jwt.claims', true)::json->'platoon_ids'
        ) AS pid(value)
        WHERE pid.value::uuid = m.current_class_id
      )
  )
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND created_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
  AND EXISTS (
    SELECT 1
    FROM "members" m
    WHERE m.id = "member_logs".member_id
      AND EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          current_setting('request.jwt.claims', true)::json->'platoon_ids'
        ) AS pid(value)
        WHERE pid.value::uuid = m.current_class_id
      )
  )
);

-- Policy: only admin/super_admin can delete member logs
CREATE POLICY member_logs_admin_delete
ON "member_logs"
FOR DELETE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);


-- =========================
-- member_log_attachments
-- =========================

ALTER TABLE "member_log_attachments" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to member_log_attachments
CREATE POLICY member_attachments_admin_full
ON "member_log_attachments"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: leaders/teachers can manage attachments for logs they can see
CREATE POLICY member_attachments_leaders_select
ON "member_log_attachments"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "member_logs" ml
    WHERE ml.id = "member_log_attachments".member_log_id
      AND (
        (current_setting('request.jwt.claims', true)::json->>'role') IN (
          'platoon_leader',
          'assistant_platoon_leader',
          'children_teacher'
        )
        AND ml.created_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      )
  )
);

CREATE POLICY member_attachments_leaders_insert
ON "member_log_attachments"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "member_logs" ml
    WHERE ml.id = "member_log_attachments".member_log_id
      AND ml.created_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
  )
);

CREATE POLICY member_attachments_leaders_update
ON "member_log_attachments"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM "member_logs" ml
    WHERE ml.id = "member_log_attachments".member_log_id
      AND (
        (current_setting('request.jwt.claims', true)::json->>'role') IN (
          'platoon_leader',
          'assistant_platoon_leader',
          'children_teacher'
        )
        AND ml.created_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "member_logs" ml
    WHERE ml.id = "member_log_attachments".member_log_id
      AND ml.created_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
  )
);


-- =========================
-- requests
-- =========================

ALTER TABLE "requests" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to requests
CREATE POLICY requests_admin_full
ON "requests"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: request creator can read their own requests
CREATE POLICY requests_creator_read
ON "requests"
FOR SELECT
USING (
  requested_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
);

-- Policy: any authenticated user can create their own request
CREATE POLICY requests_creator_insert
ON "requests"
FOR INSERT
WITH CHECK (
  requested_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
);


-- =========================
-- events
-- =========================

ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to events
CREATE POLICY events_admin_full
ON "events"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: leaders/teachers can create class-scoped events for their platoons
CREATE POLICY events_leaders_insert_class
ON "events"
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN (
    'platoon_leader',
    'assistant_platoon_leader',
    'children_teacher'
  )
  AND scope = 'CLASS'
  AND class_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM json_array_elements_text(
      current_setting('request.jwt.claims', true)::json->'platoon_ids'
    ) AS pid(value)
    WHERE pid.value::uuid = "events".class_id
  )
);

-- Policy: leaders/teachers can read events for their platoons
CREATE POLICY events_leaders_read_class
ON "events"
FOR SELECT
USING (
  (scope = 'CLASS'
   AND class_id IS NOT NULL
   AND (current_setting('request.jwt.claims', true)::json->>'role') IN (
     'platoon_leader',
     'assistant_platoon_leader',
     'children_teacher'
   )
   AND EXISTS (
     SELECT 1
     FROM json_array_elements_text(
       current_setting('request.jwt.claims', true)::json->'platoon_ids'
     ) AS pid(value)
     WHERE pid.value::uuid = "events".class_id
   )
  )
  OR
  ((current_setting('request.jwt.claims', true)::json->>'role') IN (
     'platoon_leader',
     'assistant_platoon_leader',
     'children_teacher'
   )
   AND created_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
  )
);


-- =========================
-- event_attendance
-- =========================

ALTER TABLE "event_attendance" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin have full access to event_attendance
CREATE POLICY event_attendance_admin_full
ON "event_attendance"
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: leaders can read attendance for events of their classes
CREATE POLICY event_attendance_leaders_read
ON "event_attendance"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "events" e
    JOIN "members" m ON m.id = "event_attendance".member_id
    WHERE e.id = "event_attendance".event_id
      AND e.class_id = m.current_class_id
      AND (current_setting('request.jwt.claims', true)::json->>'role') IN (
        'platoon_leader',
        'assistant_platoon_leader',
        'children_teacher'
      )
      AND EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          current_setting('request.jwt.claims', true)::json->'platoon_ids'
        ) AS pid(value)
        WHERE pid.value::uuid = e.class_id
      )
  )
);


-- =========================
-- notifications
-- =========================

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin can read all notifications
CREATE POLICY notifications_admin_read
ON "notifications"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: each user can read and update only their own notifications
CREATE POLICY notifications_user_self_select
ON "notifications"
FOR SELECT
USING (
  user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
);

CREATE POLICY notifications_user_self_update
ON "notifications"
FOR UPDATE
USING (
  user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
)
WITH CHECK (
  user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
);


-- =========================
-- activity_logs
-- =========================

ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;

-- Policy: admin and super_admin can read all activity logs
CREATE POLICY activity_logs_admin_read
ON "activity_logs"
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'super_admin')
);

-- Policy: application inserts are typically done by privileged role; no general INSERT/UPDATE/DELETE policies

