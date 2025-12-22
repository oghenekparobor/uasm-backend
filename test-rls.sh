#!/bin/bash

# Test RLS with distribution user
# First, login as distribution user to get token

echo "=== Testing RLS with Distribution User ==="
echo ""

# Login as distribution user
echo "1. Logging in as distribution@uams.test..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "distribution@uams.test",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to login. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✓ Login successful"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Test 1: Try to create a user (should fail with RLS)
echo "2. Testing: Create user (should fail - distribution cannot create users)..."
CREATE_USER_RESPONSE=$(curl -s -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "testuser@example.com",
    "firstName": "Test",
    "lastName": "User",
    "password": "Test123!@#"
  }')

echo "Response: $CREATE_USER_RESPONSE"
echo ""

# Check if it's a permission error (RLS working) or validation error
if echo "$CREATE_USER_RESPONSE" | grep -q "permission\|forbidden\|403\|not authorized"; then
  echo "✓ RLS IS WORKING: Distribution user cannot create users"
elif echo "$CREATE_USER_RESPONSE" | grep -q "validation\|400"; then
  echo "⚠ Got validation error - check if request format is correct"
else
  echo "✗ RLS NOT WORKING: Request succeeded when it should have failed"
fi
echo ""

# Test 2: Try to create a kitchen recipe (should fail with RLS)
echo "3. Testing: Create kitchen recipe (should fail - distribution cannot create recipes)..."
CREATE_RECIPE_RESPONSE=$(curl -s -X POST http://localhost:3000/kitchen/recipes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Recipe",
    "description": "Test description"
  }')

echo "Response: $CREATE_RECIPE_RESPONSE"
echo ""

# Check if it's a permission error (RLS working) or validation error
if echo "$CREATE_RECIPE_RESPONSE" | grep -q "permission\|forbidden\|403\|not authorized"; then
  echo "✓ RLS IS WORKING: Distribution user cannot create kitchen recipes"
elif echo "$CREATE_RECIPE_RESPONSE" | grep -q "validation\|400"; then
  echo "⚠ Got validation error - check if request format is correct"
else
  echo "✗ RLS NOT WORKING: Request succeeded when it should have failed"
fi
echo ""

# Test 3: Try to read users (should work - distribution can read)
echo "4. Testing: Read users list (should work - distribution can read)..."
READ_USERS_RESPONSE=$(curl -s -X GET http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN")

if echo "$READ_USERS_RESPONSE" | grep -q "data\|email"; then
  echo "✓ RLS IS WORKING: Distribution user can read users"
else
  echo "✗ Unexpected response: $READ_USERS_RESPONSE"
fi
echo ""

echo "=== Test Complete ==="

