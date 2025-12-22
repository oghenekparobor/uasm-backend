# Error Handling Documentation

## Overview

The application uses a global exception filter to provide consistent error responses across all endpoints. All errors are automatically caught, formatted, and returned in a standardized format.

## Error Response Format

All errors follow this consistent structure:

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "method": "GET",
  "message": "Validation error message",
  "error": "Bad Request",
  "details": {
    // Optional additional details
  }
}
```

### Response Fields

- **statusCode**: HTTP status code (400, 404, 500, etc.)
- **timestamp**: ISO 8601 timestamp of when the error occurred
- **path**: The API endpoint path that caused the error
- **method**: HTTP method (GET, POST, PATCH, DELETE, etc.)
- **message**: Human-readable error message
- **error**: Error type/category (optional)
- **details**: Additional error details (optional)

## Error Types

### HTTP Exceptions (NestJS)

Standard NestJS HTTP exceptions are automatically formatted:

```typescript
throw new BadRequestException('Invalid input');
throw new NotFoundException('User not found');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('Access denied');
```

**Response:**
```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "message": "Invalid input",
  "error": "Bad Request"
}
```

### Prisma Errors

Prisma database errors are automatically mapped to appropriate HTTP status codes:

#### Unique Constraint Violation (P2002)
**Status:** 409 Conflict

```json
{
  "statusCode": 409,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "message": "A record with this email already exists",
  "error": "Conflict",
  "details": {
    "field": ["email"]
  }
}
```

#### Record Not Found (P2025)
**Status:** 404 Not Found

```json
{
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users/123",
  "method": "GET",
  "message": "Record not found",
  "error": "Not Found"
}
```

#### Foreign Key Constraint (P2003)
**Status:** 400 Bad Request

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/members",
  "method": "POST",
  "message": "Invalid reference: related record does not exist",
  "error": "Bad Request",
  "details": {
    "field": "classId"
  }
}
```

#### Validation Error (P2023)
**Status:** 400 Bad Request

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/members",
  "method": "POST",
  "message": "Invalid data format",
  "error": "Bad Request"
}
```

#### Connection Timeout (P2024)
**Status:** 503 Service Unavailable

```json
{
  "statusCode": 503,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "method": "GET",
  "message": "Database connection timeout",
  "error": "Service Unavailable"
}
```

### Validation Errors

Class-validator errors are automatically formatted:

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "message": [
    "email must be an email",
    "firstName should not be empty"
  ],
  "error": "Bad Request"
}
```

### Unknown Errors

Unhandled errors return a generic 500 error without exposing internal details:

```json
{
  "statusCode": 500,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "method": "GET",
  "message": "An unexpected error occurred",
  "error": "Internal Server Error"
}
```

## Custom Exception Classes

You can use custom exception classes for more specific error handling:

```typescript
import { NotFoundException, ConflictException } from '@/common/exceptions/custom-exceptions';

// In your service
throw new NotFoundException('User', userId);
throw new ConflictException('User with this email already exists');
```

## Prisma Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| P2002 | Unique constraint violation | 409 Conflict |
| P2003 | Foreign key constraint violation | 400 Bad Request |
| P2011 | Null constraint violation | 400 Bad Request |
| P2012 | Value out of range | 400 Bad Request |
| P2014 | Required relation violation | 400 Bad Request |
| P2015 | Related record not found | 404 Not Found |
| P2016 | Query interpretation error | 400 Bad Request |
| P2017 | Records not connected | 400 Bad Request |
| P2018 | Required connected records not found | 404 Not Found |
| P2019 | Input error | 400 Bad Request |
| P2020 | Value out of range for type | 400 Bad Request |
| P2021 | Table does not exist | 500 Internal Server Error |
| P2022 | Column does not exist | 500 Internal Server Error |
| P2023 | Inconsistent column data | 400 Bad Request |
| P2024 | Connection timeout | 503 Service Unavailable |
| P2025 | Record not found | 404 Not Found |
| P2026 | Unsupported provider feature | 500 Internal Server Error |
| P2027 | Multiple errors | 400 Bad Request |

## Error Logging

- **4xx errors**: Logged as warnings
- **5xx errors**: Logged as errors with stack traces
- Sensitive information is not exposed in error responses
- Full error details are logged server-side for debugging

## Best Practices

1. **Use appropriate HTTP status codes**
   - 400: Bad Request (validation errors, invalid input)
   - 401: Unauthorized (missing/invalid authentication)
   - 403: Forbidden (insufficient permissions)
   - 404: Not Found (resource doesn't exist)
   - 409: Conflict (duplicate records, constraint violations)
   - 500: Internal Server Error (unexpected errors)

2. **Provide clear error messages**
   - Be specific about what went wrong
   - Include field names when applicable
   - Avoid exposing sensitive information

3. **Handle Prisma errors gracefully**
   - Let the global filter handle Prisma errors
   - Don't catch and re-throw unless adding context

4. **Use custom exceptions for domain-specific errors**
   - Create custom exceptions for business logic errors
   - Keep error messages user-friendly

## Example Usage

```typescript
// In a service
async findUser(id: string) {
  const user = await this.prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundException('User', id);
  }

  return user;
}

// Prisma unique constraint will be automatically handled
async createUser(dto: CreateUserDto) {
  try {
    return await this.prisma.user.create({ data: dto });
  } catch (error) {
    // Global filter will handle Prisma errors automatically
    throw error;
  }
}
```

## Testing Error Responses

```bash
# Test validation error
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid"}'

# Test not found
curl http://localhost:3000/users/non-existent-id

# Test conflict
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email": "existing@example.com"}'
```

