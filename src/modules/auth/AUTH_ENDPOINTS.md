# Auth Endpoints Documentation

## Overview

All authentication endpoints for the UAMS system.

## Endpoints

### 1. Login
**POST** `/auth/login`

Authenticate user and return access & refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-jwt-token",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "workerId": "user-uuid",
    "platoonIds": []
  }
}
```

### 2. Refresh Token
**POST** `/auth/refresh`

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh-jwt-token"
}
```

**Response:**
```json
{
  "accessToken": "new-jwt-token"
}
```

### 3. Logout
**POST** `/auth/logout`

Logout user (client-side token removal).

**Headers:**
- `Authorization: Bearer {access_token}`

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

**Note:** With stateless JWTs, logout is primarily handled client-side by removing tokens from storage. The server endpoint exists for consistency and potential future token blacklisting.

### 4. Get Current User
**GET** `/auth/me`

Get current authenticated user details.

**Headers:**
- `Authorization: Bearer {access_token}`

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "roles": ["admin", "worker"],
  "platoons": [
    {
      "id": "class-uuid",
      "name": "Platoon Alpha",
      "type": "PLATOON",
      "role": "LEADER"
    }
  ]
}
```

### 5. Change Password
**POST** `/auth/change-password`

Change password for authenticated user.

**Headers:**
- `Authorization: Bearer {access_token}`

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword123"
}
```

**Validation:**
- `newPassword` must be at least 8 characters long
- `newPassword` must be different from `currentPassword`

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

### 6. Request Password Reset
**POST** `/auth/request-password-reset`

Request password reset token (sent via email).

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Security Note:** The response message is generic to prevent email enumeration attacks.

**Implementation Notes:**
- Email is sent via Resend service
- Reset token is valid for 1 hour
- Reset token is a JWT signed with `JWT_SECRET`
- Reset link format: `{FRONTEND_URL}/reset-password?token={resetToken}`
- If email sending fails, token is logged to console in development mode

**Email Configuration:**
- Uses Resend service (configured via `RESEND_API_KEY`)
- From email configured via `RESEND_FROM_EMAIL` (defaults to `noreply@uasm.oghenekparobor.xyz`)
- Frontend URL configured via `FRONTEND_URL` (defaults to `http://localhost:3000`)

### 7. Reset Password
**POST** `/auth/reset-password`

Reset password using reset token from email.

**Request Body:**
```json
{
  "token": "reset-jwt-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Validation:**
- `newPassword` must be at least 8 characters long
- `token` must be valid and not expired (1 hour expiry)

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

## Environment Variables

Required environment variables:

```env
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@uasm.oghenekparobor.xyz
FRONTEND_URL=http://localhost:3000
```

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt (10 rounds)
2. **JWT Tokens**: Access tokens and refresh tokens use separate secrets
3. **Token Expiry**: Configurable token expiration times
4. **Email Enumeration Prevention**: Password reset endpoint doesn't reveal if email exists
5. **Password Validation**: Minimum 8 characters required
6. **Current Password Verification**: Required for password change

## Future Enhancements

1. **Email Service Integration**: Implement actual email sending for password reset
2. **Token Blacklist**: Implement refresh token blacklist for logout
3. **Rate Limiting**: Add rate limiting to prevent brute force attacks
4. **2FA**: Add two-factor authentication support
5. **Password Strength Meter**: Enhanced password validation

## Error Responses

All endpoints return standard HTTP status codes:

- `200 OK`: Success
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid credentials or token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

