# Rate Limiting Documentation

## Overview

The API implements rate limiting to prevent abuse and ensure fair usage. Rate limits are applied globally and can be customized per endpoint.

## Default Rate Limits

### Read Operations (GET, HEAD, OPTIONS)
- **Limit**: 500 requests per minute (configurable via `THROTTLE_RELAXED_LIMIT`)
- **Window**: 60 seconds (configurable via `THROTTLE_RELAXED_TTL`)
- **Applies to**: All GET endpoints that fetch data

### Write Operations (POST, PUT, PATCH, DELETE)
- **Limit**: 100 requests per minute (configurable via `THROTTLE_LIMIT`)
- **Window**: 60 seconds (configurable via `THROTTLE_TTL`)
- **Applies to**: All write endpoints

### Authentication Endpoints
- **Login**: 5 attempts per minute
- **Password Reset Request**: 3 requests per minute
- **Password Reset**: 5 attempts per minute
- **Change Password**: 5 attempts per minute
- **Refresh Token**: 10 requests per minute

### File Upload Endpoints
- **File Uploads**: 20 uploads per minute
- **File URL Generation**: 50 requests per minute

## Configuration

Rate limits can be configured via environment variables:

```env
# Default rate limit for write operations (POST, PUT, PATCH, DELETE)
THROTTLE_LIMIT=100
THROTTLE_TTL=60000

# Relaxed rate limit for read operations (GET, HEAD, OPTIONS)
THROTTLE_RELAXED_LIMIT=500
THROTTLE_RELAXED_TTL=60000

# Strict rate limit (for sensitive endpoints)
THROTTLE_STRICT_LIMIT=10
THROTTLE_STRICT_TTL=60000

# Auth-specific rate limit
THROTTLE_AUTH_LIMIT=5
THROTTLE_AUTH_TTL=60000
```

## Rate Limit Response

When rate limit is exceeded, the API returns:

**Status Code:** `429 Too Many Requests`

**Response:**
```json
{
  "statusCode": 429,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/auth/login",
  "method": "POST",
  "message": "Too many requests. Please try again later.",
  "error": "Too Many Requests",
  "retryAfter": 60
}
```

### Response Headers

Rate limit information is also included in response headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets
- `Retry-After`: Seconds to wait before retrying

## Rate Limit Tracking

Rate limits are tracked by:
- **Authenticated users**: User ID (allows higher limits per user)
- **Unauthenticated requests**: IP address

This means:
- Different users have separate rate limit counters
- Multiple requests from the same IP share the same counter
- Authenticated users typically get higher limits

## Endpoint-Specific Limits

### Authentication (`/auth/*`)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/login` | 5 | 1 minute |
| `POST /auth/refresh` | 10 | 1 minute |
| `POST /auth/request-password-reset` | 3 | 1 minute |
| `POST /auth/reset-password` | 5 | 1 minute |
| `POST /auth/change-password` | 5 | 1 minute |

### File Uploads (`/files/*`, `/logs/*/attachments`)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /logs/:id/attachments` | 20 | 1 minute |
| `GET /files/:publicId` | 50 | 1 minute |

### All Other Endpoints

| Endpoint | Limit | Window |
|----------|-------|--------|
| GET/HEAD/OPTIONS (read operations) | 500 | 1 minute |
| POST/PUT/PATCH/DELETE (write operations) | 100 | 1 minute |

## Customizing Rate Limits

### Per-Endpoint Limits

Use the `@Throttle()` decorator to set custom limits:

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('example')
export class ExampleController {
  @Get()
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  findAll() {
    // ...
  }
}
```

### Multiple Rate Limit Profiles

You can define multiple rate limit profiles:

```typescript
@Throttle({ 
  default: { limit: 100, ttl: 60000 },
  strict: { limit: 10, ttl: 60000 }
})
```

## Best Practices

1. **Handle 429 errors gracefully** - Show user-friendly messages
2. **Respect Retry-After header** - Wait before retrying
3. **Implement exponential backoff** - For retry logic
4. **Cache responses** - Reduce API calls when possible
5. **Batch requests** - Combine multiple operations when possible

## Frontend Integration

### Handling Rate Limit Errors

```typescript
async function apiCall() {
  try {
    const response = await fetch('/api/endpoint');
    
    if (response.status === 429) {
      const data = await response.json();
      const retryAfter = response.headers.get('Retry-After') || data.retryAfter;
      
      console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
      // Show user-friendly message
      // Implement retry logic with delay
      return;
    }
    
    return response.json();
  } catch (error) {
    // Handle error
  }
}
```

### Reading Rate Limit Headers

```typescript
const response = await fetch('/api/endpoint');
const limit = response.headers.get('X-RateLimit-Limit');
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

console.log(`Rate limit: ${remaining}/${limit}`);
console.log(`Resets at: ${new Date(parseInt(reset) * 1000)}`);
```

## Monitoring

Rate limit violations are logged server-side:
- **4xx errors**: Logged as warnings
- Includes IP address or user ID
- Includes endpoint path and method
- Includes timestamp

## Security Considerations

1. **IP-based tracking**: May be bypassed with VPNs/proxies
2. **User-based tracking**: More accurate for authenticated users
3. **Distributed systems**: Consider Redis for shared rate limit state
4. **DDoS protection**: Rate limiting is one layer, not complete protection

## Production Recommendations

1. **Use Redis storage**: For distributed rate limiting across multiple servers
2. **Increase limits for authenticated users**: Better UX for legitimate users
3. **Implement progressive delays**: Increase delay with repeated violations
4. **Monitor patterns**: Detect and block abusive patterns
5. **Whitelist trusted IPs**: For internal services or partners

## Environment Variables

Add these to your `.env` file:

```env
# Rate Limiting Configuration
THROTTLE_LIMIT=100          # Default requests per minute (write operations)
THROTTLE_TTL=60000          # Time window in milliseconds (1 minute)
THROTTLE_RELAXED_LIMIT=500  # Relaxed limit for read operations (GET, HEAD, OPTIONS)
THROTTLE_RELAXED_TTL=60000  # Relaxed time window
THROTTLE_STRICT_LIMIT=10    # Strict limit for sensitive endpoints
THROTTLE_STRICT_TTL=60000   # Strict time window
THROTTLE_AUTH_LIMIT=5       # Auth endpoint limit
THROTTLE_AUTH_TTL=60000     # Auth time window
```

## Testing Rate Limits

```bash
# Test rate limit (should fail after limit)
for i in {1..110}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}'
done

# Check rate limit headers
curl -I http://localhost:3000/users \
  -H "Authorization: Bearer {token}"
```

