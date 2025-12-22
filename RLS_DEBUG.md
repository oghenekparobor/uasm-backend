# RLS Debugging Guide

## Issue: Distribution user can still create recipes

The middleware approach isn't working because Prisma uses connection pooling, and `set_config` may not persist across different connections from the pool.

## Current Status

1. ✅ RLS policies are correctly set up in the database
2. ✅ Middleware is configured in PrismaService
3. ❌ RLS context is not being enforced (distribution can create recipes)

## Debugging Steps

### 1. Check if middleware is running

Add logging to see if middleware is being called:

```typescript
this.$use(async (params, next) => {
  console.log('Middleware called:', params.model, params.action);
  // ... rest of middleware
});
```

### 2. Check if RLS context is set

Add logging to verify context is being set:

```typescript
this.logger.debug(`RLS context set for role: ${claims.role}`);
```

### 3. Test RLS directly in PostgreSQL

```sql
SET ROLE uams_api;
SELECT set_config('request.jwt.claims', '{"role":"distribution"}', true);
INSERT INTO kitchen_recipes (id, name, description, created_at, updated_at) 
VALUES (gen_random_uuid(), 'Test', 'Test', NOW(), NOW());
-- Should fail with permission denied
```

### 4. Verify Prisma is using the correct database role

Check `DATABASE_URL` in `.env`:
```
DATABASE_URL="postgresql://uams_api:password@localhost:5432/uasm?schema=public"
```

## Solution: Use Transactions

The transaction approach ensures RLS context is set on the same connection:

```typescript
return this.prisma.$transaction(async (tx) => {
  // Set RLS context
  await tx.$executeRawUnsafe(`SELECT set_config(...)`);
  // Execute query
  return tx.kitchenRecipe.create(...);
});
```

However, this is inefficient for all queries. A better solution is needed.

## Better Solution: Prisma Extension

Use Prisma's `$extends` API to automatically set context:

```typescript
const extendedPrisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        // Set RLS context
        await prisma.$executeRawUnsafe(`SELECT set_config(...)`);
        return query(args);
      },
    },
  },
});
```

But this has the same connection pooling issue.

## Root Cause

Prisma uses connection pooling. When we call `$executeRawUnsafe` to set context, it might use a different connection than the actual query. The `set_config` with `true` only persists for the current session/connection.

## Recommended Solution

1. **Use Prisma's connection-level settings** (if available)
2. **Use a single connection per request** (disable pooling for RLS)
3. **Use transactions for all write operations** (ensures same connection)
4. **Use a PostgreSQL extension** that supports connection-level RLS context

## Temporary Fix

For now, use transactions for write operations that need RLS enforcement:

```typescript
async createRecipe(dto: CreateRecipeDto) {
  return this.prisma.$transaction(async (tx) => {
    // Set RLS context
    const user = (this.request as any).user;
    if (user) {
      await tx.$executeRawUnsafe(
        `SELECT set_config('request.jwt.claims', $1, true)`,
        JSON.stringify({ role: user.role, ... }),
      );
    }
    // Execute query
    return tx.kitchenRecipe.create({ data: dto });
  });
}
```

