# RLS Testing Guide

## Overview

Row Level Security (RLS) is now enforced via Prisma middleware that sets the RLS context before every query. This ensures that PostgreSQL RLS policies are applied to all database operations.

## How RLS Works

1. **JWT Authentication**: When a user logs in, their role and claims are stored in the JWT token
2. **Guard Sets Context**: `JwtAuthGuard` extracts the JWT claims and sets them on the request
3. **Prisma Middleware**: Before every Prisma query, middleware sets the RLS context in PostgreSQL using `set_config('request.jwt.claims', ...)`
4. **PostgreSQL RLS**: PostgreSQL evaluates RLS policies based on the JWT claims and blocks unauthorized operations

## Testing RLS

### Prerequisites

1. Make sure the server is running
2. Have valid credentials for different user roles:
   - `distribution@uams.test` (distribution role)
   - `admin@uams.test` (admin role)
   - `kitchen@uams.test` (kitchen role)

### Test Script

Run the automated test script:

```bash
./test-rls.sh
```

### Manual Testing

#### 1. Test Distribution User Cannot Create Users

```bash
# Login as distribution user
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"distribution@uams.test","password":"password123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Try to create a user (should fail with 403 Forbidden)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "testuser@example.com",
    "firstName": "Test",
    "lastName": "User",
    "password": "Test123!@#"
  }'
```

**Expected Result**: `403 Forbidden` - "You do not have permission to perform this action"

#### 2. Test Distribution User Cannot Create Kitchen Recipes

```bash
# Use the same token from above
curl -X POST http://localhost:3000/kitchen/recipes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Recipe",
    "description": "Test description"
  }'
```

**Expected Result**: `403 Forbidden` - "You do not have permission to perform this action"

#### 3. Test Distribution User Can Read Users

```bash
# Use the same token from above
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Result**: `200 OK` - List of users (filtered by RLS)

#### 4. Test Admin User Can Create Users

```bash
# Login as admin user
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@uams.test","password":"password123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Create a user (should succeed)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "newuser@example.com",
    "firstName": "New",
    "lastName": "User",
    "password": "Test123!@#"
  }'
```

**Expected Result**: `201 Created` - User created successfully

#### 5. Test Kitchen User Can Create Recipes

```bash
# Login as kitchen user
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kitchen@uams.test","password":"password123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Create a recipe (should succeed)
curl -X POST http://localhost:3000/kitchen/recipes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "New Recipe",
    "description": "Recipe description"
  }'
```

**Expected Result**: `201 Created` - Recipe created successfully

## Troubleshooting

### RLS Not Working

If RLS is not blocking unauthorized requests:

1. **Check RLS is enabled on tables**:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE schemaname = 'public' AND tablename IN ('users', 'kitchen_recipes');
   ```
   Should show `rowsecurity = t`

2. **Check RLS policies exist**:
   ```sql
   SELECT tablename, policyname, cmd FROM pg_policies 
   WHERE tablename IN ('users', 'kitchen_recipes');
   ```

3. **Check JWT claims are being set**:
   - Look at server logs - the middleware should be setting context before each query
   - Check PostgreSQL logs for RLS policy evaluation

4. **Verify user role in JWT**:
   - Decode the JWT token at jwt.io
   - Verify the `role` field matches what's expected

### Getting Validation Errors Instead of RLS Errors

If you're getting `400 Validation failed` instead of `403 Forbidden`:

1. **Check request format**: Ensure all required fields are present and valid
2. **Check password strength**: Must be at least 8 characters with uppercase, lowercase, number, and special character
3. **Check email format**: Must be a valid email address

### Common Issues

1. **Middleware not running**: Ensure Prisma middleware is set up in `onModuleInit()`
2. **Context not persisting**: The middleware should set context before every query
3. **Role mismatch**: Verify the role in the JWT matches what RLS policies expect

## Expected Behavior

| Action | Distribution User | Kitchen User | Admin User |
|--------|-------------------|--------------|------------|
| Create User | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ 201 Created |
| Read Users | ✅ 200 OK (filtered) | ✅ 200 OK (filtered) | ✅ 200 OK (all) |
| Create Recipe | ❌ 403 Forbidden | ✅ 201 Created | ✅ 201 Created |
| Read Recipes | ✅ 200 OK | ✅ 200 OK | ✅ 200 OK |

## Debugging

To debug RLS issues, check:

1. **Server logs**: Look for middleware execution and context setting
2. **PostgreSQL logs**: Check for RLS policy evaluation messages
3. **JWT token**: Decode and verify claims match expected format
4. **Database connection**: Ensure using the correct database role (`uams_api`)

## Notes

- RLS context is set automatically before every Prisma query via middleware
- The context persists for the duration of the database connection
- If you see validation errors (400), fix those first before testing RLS
- RLS errors should return 403 Forbidden, not 500 Internal Server Error

