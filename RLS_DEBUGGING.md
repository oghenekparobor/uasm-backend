# RLS Debugging Guide

## Current Implementation

RLS context is set using Prisma transactions via the `withRLSContext()` helper method. This ensures that:
1. RLS context is set at the START of a transaction
2. All queries within that transaction use the SAME database connection
3. RLS policies are evaluated correctly because the context persists for the transaction

## Why RLS Might Not Be Working

### 1. **Not Using `withRLSContext()` for Write Operations**
All write operations that need RLS enforcement MUST use `withRLSContext()`. Check if your service methods are using it:

```typescript
// ✅ CORRECT - Uses transaction with RLS context
return this.prisma.withRLSContext(async (tx) => {
  return tx.userRole.create({ ... });
});

// ❌ WRONG - No RLS context, will fail
return this.prisma.userRole.create({ ... });
```

### 2. **Connection Pooling Issues**
Even with transactions, if Prisma is using connection pooling incorrectly, the context might not persist. Check your `DATABASE_URL` - ensure it doesn't have connection pool settings that might interfere.

### 3. **RLS Policies Not Applied**
Verify that RLS policies are actually applied in the database:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_roles';

-- Check policies
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_roles';
```

### 4. **Database Role Bypassing RLS**
If your database user has `BYPASSRLS` privilege, RLS policies won't be enforced:

```sql
-- Check role privileges
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'uams_api';
```

If `rolbypassrls` is `t` (true), RLS is bypassed. Fix by:

```sql
ALTER ROLE uams_api WITH BYPASSRLS = false;
```

### 5. **JWT Claims Not Set Correctly**
Verify that JWT claims are being set correctly in the request:

```typescript
// In JwtAuthGuard, check:
console.log('RLS Claims:', request.user_rls);
console.log('User:', request.user);
```

### 6. **Testing RLS Directly**
Test RLS directly in PostgreSQL:

```sql
-- Connect as uams_api role
SET ROLE uams_api;

-- Set RLS context (simulating what Prisma does)
SELECT set_config('request.jwt.claims', '{"sub":"test","role":"worker","worker_id":null,"platoon_ids":[]}', true);

-- Verify context is set
SELECT current_setting('request.jwt.claims', true)::json->>'role' as role;

-- Try to insert (should fail for worker role)
INSERT INTO user_roles (user_id, role_id) 
SELECT id, 1 FROM users LIMIT 1;
-- Expected: ERROR: new row violates row-level security policy

-- Now test with admin role
SELECT set_config('request.jwt.claims', '{"sub":"test","role":"admin","worker_id":null,"platoon_ids":[]}', true);

-- Try to insert (should succeed for admin role)
INSERT INTO user_roles (user_id, role_id) 
SELECT id, 1 FROM users LIMIT 1 
ON CONFLICT DO NOTHING;
-- Expected: Success
```

## Debugging Steps

1. **Enable Debug Logging**
   Add logging to see when RLS context is set:
   ```typescript
   this.logger.debug(`RLS context set in transaction for role: ${claims.role}`);
   ```

2. **Check Transaction Behavior**
   Verify that transactions are actually using the same connection:
   ```typescript
   // Add logging in withRLSContext
   this.logger.debug('Starting transaction with RLS context');
   ```

3. **Test with Different Roles**
   Test with worker, admin, and super_admin tokens to see which ones work/fail.

4. **Check Error Messages**
   If RLS is working, you should get:
   ```
   ERROR: new row violates row-level security policy
   ```
   If you get a different error or no error, RLS might not be enforced.

## Common Issues and Fixes

### Issue: Worker can assign roles
**Fix**: Ensure `assignRole()` uses `withRLSContext()` and all operations are inside the transaction.

### Issue: RLS works in tests but not in API
**Fix**: Check that `JwtAuthGuard` is setting `request.user_rls` correctly, and that `PrismaService` can access it.

### Issue: Some operations work, others don't
**Fix**: Ensure ALL write operations use `withRLSContext()`. Read operations might work without it due to different connection behavior.

## Next Steps

1. Verify all write operations use `withRLSContext()`
2. Check database role privileges (`BYPASSRLS`)
3. Test RLS directly in PostgreSQL
4. Enable debug logging to trace RLS context setting
5. Consider using Prisma's `$extends` API for a more robust solution (if available in your Prisma version)

