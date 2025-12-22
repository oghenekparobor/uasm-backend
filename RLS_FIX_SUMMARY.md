# RLS Fix Summary

## Problem
A `worker` role user was able to assign and remove roles, which should only be allowed for `admin`/`super_admin` roles. RLS policies were correct, but the RLS context (`request.jwt.claims`) was not being set correctly on the database connection.

## Root Cause
1. **Connection Pooling**: Prisma uses connection pooling, so when we set RLS context using `$executeRawUnsafe`, it might execute on a different connection than the actual query.
2. **Middleware Approach**: The `$use` middleware tried to set context before every query, but due to connection pooling, the context-setting query and the actual query could use different connections.
3. **Transaction Context**: Even within transactions, if context is not set on the same connection, RLS policies won't be evaluated correctly.

## Solution
1. **Removed Unreliable Middleware**: Removed the `$use` middleware that tried to set context before every query.
2. **Transaction-Based Context Setting**: Created `withRLSContext()` helper method that:
   - Wraps operations in a Prisma transaction
   - Sets RLS context (`request.jwt.claims`) at the START of the transaction using `$executeRawUnsafe`
   - Ensures all queries within the transaction use the same connection with the correct RLS context
3. **Updated Critical Operations**: Modified all write operations to use `withRLSContext()`:
   - `UsersService.create()` - User creation
   - `UsersService.update()` - User updates
   - `UsersService.assignRole()` - Role assignment (moved ALL validation inside transaction)
   - `UsersService.removeRole()` - Role removal (moved ALL validation inside transaction)
   - `KitchenService.createRecipe()` - Recipe creation

## How It Works
```typescript
async withRLSContext<T>(fn: (tx) => Promise<T>): Promise<T> {
  return this.$transaction(async (tx) => {
    // Set RLS context within the transaction
    const claims = this.getRLSClaims();
    if (claims) {
      await tx.$executeRawUnsafe(
        `SELECT set_config('request.jwt.claims', $1, true)`,
        JSON.stringify(claims),
      );
    }
    
    // Execute the function with RLS context set
    return fn(tx);
  });
}
```

The key is that Prisma transactions use the same database connection for all queries within the transaction. By setting the RLS context at the start of the transaction, we ensure that all subsequent queries in that transaction have the correct context.

## Testing
After restarting the server, test with a worker token:
- `POST /users/:id/roles` - Should return `403 Forbidden`
- `DELETE /users/:id/roles/:roleId` - Should return `403 Forbidden`
- `POST /users` - Should return `403 Forbidden`
- `POST /kitchen/recipes` - Should return `403 Forbidden` (for non-kitchen roles)

## Next Steps
1. Apply `withRLSContext()` to ALL write operations across all services
2. Consider using it for read operations that need RLS filtering
3. Monitor logs to ensure RLS is working correctly
4. Consider adding integration tests to verify RLS enforcement

