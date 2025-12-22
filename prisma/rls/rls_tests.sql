-- =========================================================
-- UAMS RLS smoke tests
-- NOTE: Run in psql inside a transaction so SET LOCAL applies:
-- BEGIN;
--   \i backend/prisma/rls/rls_tests.sql
-- ROLLBACK; -- or COMMIT if you want to keep inserted rows
-- =========================================================

-- Helper: show which user/role we are testing as
\echo '--- CURRENT CLAIMS ---'
SELECT current_setting('request.jwt.claims', true) AS jwt_claims;


-- =========================================================
-- 1) SUPER ADMIN: should see everything
-- =========================================================

SET LOCAL request.jwt.claims = '{
  "sub": "00000000-0000-0000-0000-000000000001",
  "role": "super_admin",
  "worker_id": "00000000-0000-0000-0000-000000000101",
  "platoon_ids": ["00000000-0000-0000-0000-00000000aaaa"]
}';

\echo '--- SUPER_ADMIN: users (should return all rows) ---'
SELECT count(*) AS super_admin_users_count FROM users;

\echo '--- SUPER_ADMIN: members (should return all rows) ---'
SELECT count(*) AS super_admin_members_count FROM members;

\echo '--- SUPER_ADMIN: activity_logs (should be readable) ---'
SELECT count(*) AS super_admin_activity_logs_count FROM activity_logs;


-- =========================================================
-- 2) ADMIN: full CRUD except super-admin-specific app rules
-- =========================================================

SET LOCAL request.jwt.claims = '{
  "sub": "00000000-0000-0000-0000-000000000002",
  "role": "admin",
  "worker_id": "00000000-0000-0000-0000-000000000102",
  "platoon_ids": ["00000000-0000-0000-0000-00000000aaaa"]
}';

\echo '--- ADMIN: users (should return all rows) ---'
SELECT count(*) AS admin_users_count FROM users;

\echo '--- ADMIN: members (should return all rows) ---'
SELECT count(*) AS admin_members_count FROM members;

\echo '--- ADMIN: can see all empowerment_requests ---'
SELECT count(*) AS admin_empowerment_count FROM empowerment_requests;

\echo '--- ADMIN: can see all requests ---'
SELECT count(*) AS admin_requests_count FROM requests;


-- =========================================================
-- 3) PLATOON LEADER: class-scoped access
-- =========================================================

SET LOCAL request.jwt.claims = '{
  "sub": "00000000-0000-0000-0000-000000000003",
  "role": "platoon_leader",
  "worker_id": "00000000-0000-0000-0000-000000000103",
  "platoon_ids": ["00000000-0000-0000-0000-00000000aaaa", "00000000-0000-0000-0000-00000000bbbb"]
}';

\echo '--- PLATOON_LEADER: classes (should only see assigned) ---'
SELECT id, name, type
FROM classes
ORDER BY id
LIMIT 10;

\echo '--- PLATOON_LEADER: members (should only see members in platoon_ids) ---'
SELECT id, first_name, last_name, current_class_id
FROM members
ORDER BY current_class_id, last_name
LIMIT 20;

\echo '--- PLATOON_LEADER: class_attendance (only own classes) ---'
SELECT class_id, attendance_window_id, count
FROM class_attendance
ORDER BY class_id, attendance_window_id
LIMIT 20;

\echo '--- PLATOON_LEADER: member_logs (only for own members) ---'
SELECT id, member_id, created_by, created_at
FROM member_logs
ORDER BY created_at DESC
LIMIT 20;


-- =========================================================
-- 4) DISTRIBUTION: no raw attendance write, can see distributions
-- =========================================================

SET LOCAL request.jwt.claims = '{
  "sub": "00000000-0000-0000-0000-000000000004",
  "role": "distribution",
  "worker_id": "00000000-0000-0000-0000-000000000104",
  "platoon_ids": []
}';

\echo '--- DISTRIBUTION: members (read-only, should be allowed) ---'
SELECT count(*) AS distribution_members_visible FROM members;

\echo '--- DISTRIBUTION: class_distributions (should see all) ---'
SELECT count(*) AS distribution_class_distributions_visible FROM class_distributions;

\echo '--- DISTRIBUTION: class_attendance SELECT (should be blocked by RLS) ---'
-- Expect: zero rows or ERROR depending on data and policies
SELECT count(*) AS distribution_class_attendance_visible FROM class_attendance;


-- =========================================================
-- 5) KITCHEN: recipes + own production logs
-- =========================================================

SET LOCAL request.jwt.claims = '{
  "sub": "00000000-0000-0000-0000-000000000005",
  "role": "kitchen",
  "worker_id": "00000000-0000-0000-0000-000000000105",
  "platoon_ids": []
}';

\echo '--- KITCHEN: kitchen_recipes (should be readable) ---'
SELECT count(*) AS kitchen_recipes_visible FROM kitchen_recipes;

\echo '--- KITCHEN: kitchen_production_logs (only logs by this user) ---'
SELECT id, recipe_id, quantity, week_date, logged_by
FROM kitchen_production_logs
ORDER BY week_date DESC
LIMIT 20;


-- =========================================================
-- 6) WORKER (generic): own requests & notifications only
-- =========================================================

SET LOCAL request.jwt.claims = '{
  "sub": "00000000-0000-0000-0000-000000000006",
  "role": "worker",
  "worker_id": "00000000-0000-0000-0000-000000000106",
  "platoon_ids": []
}';

\echo '--- WORKER: own requests only ---'
SELECT id, type, status, requested_by
FROM requests
ORDER BY created_at DESC
LIMIT 20;

\echo '--- WORKER: own notifications only ---'
SELECT id, title, is_read
FROM notifications
ORDER BY created_at DESC
LIMIT 20;


-- =========================================================
-- 7) SELF user checks on users table
-- =========================================================

SET LOCAL request.jwt.claims = '{
  "sub": "00000000-0000-0000-0000-000000000007",
  "role": "worker",
  "worker_id": "00000000-0000-0000-0000-000000000107",
  "platoon_ids": []
}';

\echo '--- SELF: users (should only see own row if it exists) ---'
SELECT * FROM users;

