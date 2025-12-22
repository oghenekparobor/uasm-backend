# How to Check Database Role Privileges and RLS Status

## 1. Check if Role Bypasses RLS (Most Critical)

```sql
SELECT rolname, rolbypassrls, rolcanlogin, rolsuper 
FROM pg_roles 
WHERE rolname = 'uams_api';
```

**Expected Result:**
- `rolbypassrls` should be `f` (false) - RLS is NOT bypassed ✅
- `rolcanlogin` should be `t` (true) - Role can login ✅
- `rolsuper` should be `f` (false) - Not a superuser ✅

**If `rolbypassrls` is `t` (true), fix it:**
```sql
ALTER ROLE uams_api WITH BYPASSRLS = false;
```

## 2. Check if RLS is Enabled on Tables

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_roles', 'kitchen_recipes', 'members', 'classes')
ORDER BY tablename;
```

**Expected Result:**
- `rowsecurity` should be `t` (true) for all tables ✅

**If RLS is disabled, enable it:**
```sql
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

## 3. Check RLS Policies

```sql
-- List all policies for a specific table
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_roles'
ORDER BY policyname;
```

**Expected Policies for `user_roles`:**
- `user_roles_admin_insert` - INSERT policy for admin/super_admin
- `user_roles_admin_select` - SELECT policy for admin/super_admin
- `user_roles_admin_update` - UPDATE policy for admin/super_admin
- `user_roles_super_admin_full` - ALL policy for super_admin

## 4. Test RLS Directly in PostgreSQL

### Test 1: Worker Role Should NOT Be Able to Insert

```sql
-- Connect as uams_api role
SET ROLE uams_api;

-- Set RLS context as worker
SELECT set_config('request.jwt.claims', 
  '{"sub":"test-worker","role":"worker","worker_id":"test-worker","platoon_ids":[]}', 
  true
);

-- Verify context is set
SELECT current_setting('request.jwt.claims', true)::json->>'role' as role;
-- Should return: worker

-- Try to insert (should FAIL)
INSERT INTO user_roles (user_id, role_id) 
SELECT id, 1 FROM users LIMIT 1;
-- Expected: ERROR: new row violates row-level security policy
```

### Test 2: Admin Role SHOULD Be Able to Insert

```sql
-- Still connected as uams_api role
SET ROLE uams_api;

-- Set RLS context as admin
SELECT set_config('request.jwt.claims', 
  '{"sub":"test-admin","role":"admin","worker_id":"test-admin","platoon_ids":[]}', 
  true
);

-- Verify context is set
SELECT current_setting('request.jwt.claims', true)::json->>'role' as role;
-- Should return: admin

-- Try to insert (should SUCCEED)
INSERT INTO user_roles (user_id, role_id) 
SELECT id, 1 FROM users LIMIT 1
ON CONFLICT DO NOTHING;
-- Expected: INSERT 0 1 (or 0 0 if conflict)
```

## 5. Check Current Database Connection Role

```sql
-- See what role you're currently using
SELECT current_user, session_user;

-- See what role is set for the session
SHOW role;
```

## 6. Verify Prisma is Using the Correct Role

Check your `.env` file:
```bash
DATABASE_URL="postgresql://uams_api:password@localhost:5432/uasm?schema=public"
```

Make sure it's using `uams_api` and NOT `postgres` or any superuser role.

## 7. Check Table Permissions

```sql
-- Check what permissions uams_api has on tables
SELECT grantee, table_schema, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE grantee = 'uams_api' 
AND table_schema = 'public'
ORDER BY table_name, privilege_type;
```

**Expected:** Should have `SELECT`, `INSERT`, `UPDATE` permissions (but RLS will control access)

## Quick Diagnostic Script

Run this to check everything at once:

```sql
-- 1. Check role privileges
SELECT 
  'Role Bypass RLS' as check_type,
  CASE WHEN rolbypassrls THEN '❌ BYPASSED - RLS NOT WORKING!' 
       ELSE '✅ RLS Enabled' END as status
FROM pg_roles WHERE rolname = 'uams_api'

UNION ALL

-- 2. Check RLS enabled on critical tables
SELECT 
  'RLS Enabled on ' || tablename as check_type,
  CASE WHEN rowsecurity THEN '✅ Enabled' 
       ELSE '❌ DISABLED!' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_roles', 'kitchen_recipes')

UNION ALL

-- 3. Check policies exist
SELECT 
  'Policies on user_roles' as check_type,
  CASE WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' policies' 
       ELSE '❌ NO POLICIES!' END as status
FROM pg_policies 
WHERE tablename = 'user_roles';
```

## Common Issues and Fixes

### Issue: `rolbypassrls = t` (true)
**Fix:**
```sql
ALTER ROLE uams_api WITH BYPASSRLS = false;
```

### Issue: RLS not enabled on table
**Fix:**
```sql
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

### Issue: No policies exist
**Fix:** Run the RLS policies SQL file:
```bash
psql -h localhost -U postgres -d uasm -f prisma/rls/rls_policies.sql
```

### Issue: Using wrong database role in connection string
**Fix:** Update `.env` to use `uams_api`:
```bash
DATABASE_URL="postgresql://uams_api:password@localhost:5432/uasm?schema=public"
```

