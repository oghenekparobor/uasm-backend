# HTTP Request Logging Documentation

## Overview

All HTTP requests and responses are automatically logged for audit trails and debugging. The logging middleware captures request details, response status, timing, and user information.

## What Gets Logged

### Request Information
- **Timestamp**: ISO 8601 timestamp
- **Method**: HTTP method (GET, POST, PATCH, DELETE, etc.)
- **Path**: API endpoint path (without query string)
- **Query Parameters**: Query string parameters (if present)
- **IP Address**: Client IP address (respects X-Forwarded-For header)
- **User Agent**: Browser/client user agent string
- **User ID**: Authenticated user ID (if available)

### Response Information
- **Status Code**: HTTP response status code
- **Response Time**: Time taken to process request (in milliseconds)
- **Error Details**: Error messages for failed requests (4xx, 5xx)

## Log Format

### Request Log
```
[HTTP] [REQUEST] POST /api/users (User: user-uuid-123)
```

### Response Log
```
[HTTP] [RESPONSE] POST /api/users 201 (45ms) (User: user-uuid-123)
[HTTP] [RESPONSE] GET /api/members 200 (12ms) (User: user-uuid-123)
[HTTP] [RESPONSE] POST /api/auth/login 401 (8ms)
[HTTP] [RESPONSE] GET /api/users 500 (234ms) (User: user-uuid-123)
```

## Log Levels

- **LOG**: Successful requests (2xx status codes)
- **WARN**: Redirects (3xx status codes)
- **ERROR**: Client errors (4xx) and server errors (5xx)

## Security Features

### Sensitive Data Redaction

The following fields are automatically redacted from logs:
- `password`
- `currentPassword`
- `newPassword`
- `passwordHash`
- `token`
- `accessToken`
- `refreshToken`
- `apiKey`
- `secret`
- `authorization`

**Example:**
```json
// Request body logged as:
{
  "email": "user@example.com",
  "password": "[REDACTED]"
}
```

### Excluded Endpoints

The following endpoints are excluded from logging to reduce noise:
- `GET /health` - Health check endpoint
- `GET /ping` - Ping endpoint

## Log Output

Logs are output to the console in a structured format:

```
[Nest] 12345  - 01/15/2024, 10:30:00 AM     LOG [HTTP] [REQUEST] POST /api/users (User: user-uuid-123)
[Nest] 12345  - 01/15/2024, 10:30:00 AM     LOG [HTTP] [RESPONSE] POST /api/users 201 (45ms) (User: user-uuid-123)
```

## Example Logs

### Successful Request
```
[HTTP] [REQUEST] GET /api/members?page=1&limit=20 (User: user-uuid-123)
[HTTP] [RESPONSE] GET /api/members?page=1&limit=20 200 (15ms) (User: user-uuid-123)
```

### Failed Request
```
[HTTP] [REQUEST] POST /api/auth/login
[HTTP] [RESPONSE] POST /api/auth/login 401 (8ms)
```

### Error Request
```
[HTTP] [REQUEST] GET /api/users/non-existent-id (User: user-uuid-123)
[HTTP] [RESPONSE] GET /api/users/non-existent-id 404 (12ms) (User: user-uuid-123)
```

### Server Error
```
[HTTP] [REQUEST] POST /api/members (User: user-uuid-123)
[HTTP] [RESPONSE] POST /api/members 500 (234ms) (User: user-uuid-123)
```

## IP Address Detection

The middleware detects client IP addresses in the following order:
1. `X-Forwarded-For` header (first IP if multiple)
2. `X-Real-IP` header
3. `req.ip` (from Express)
4. `req.socket.remoteAddress`
5. `'unknown'` (fallback)

This ensures accurate IP logging even behind proxies/load balancers.

## User Identification

- **Authenticated requests**: User ID is extracted from `req.user.id` (set by `JwtAuthGuard`)
- **Unauthenticated requests**: No user ID is logged

## Performance Impact

- **Minimal overhead**: Logging is synchronous but lightweight
- **No blocking**: Logging doesn't block request processing
- **Health checks excluded**: Reduces noise from monitoring systems

## Integration with Activity Logs

Request logging is separate from activity logs:
- **Request Logging**: All HTTP requests/responses (audit trail)
- **Activity Logs**: Business logic events (attendance, approvals, etc.)

Both complement each other for complete audit coverage.

## Production Considerations

### Log Aggregation

For production, consider:
1. **Structured logging**: Use JSON format for log aggregation tools
2. **Log rotation**: Implement log file rotation
3. **External logging**: Send logs to external services (Datadog, CloudWatch, etc.)
4. **Log retention**: Define retention policies

### Example: Winston Logger Integration

```typescript
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

// In app.module.ts
WinstonModule.forRoot({
  transports: [
    new winston.transports.File({
      filename: 'logs/requests.log',
      format: winston.format.json(),
    }),
  ],
})
```

### Example: Log to File

```typescript
import * as fs from 'fs';
import * as path from 'path';

// In middleware
const logStream = fs.createWriteStream(
  path.join(__dirname, '../../logs/requests.log'),
  { flags: 'a' }
);

logStream.write(JSON.stringify(logEntry) + '\n');
```

## Monitoring and Alerting

Use request logs for:
- **Performance monitoring**: Track response times
- **Error tracking**: Monitor error rates
- **Security auditing**: Track suspicious patterns
- **Usage analytics**: Understand API usage patterns

## Best Practices

1. **Don't log sensitive data**: Already handled by redaction
2. **Monitor log volume**: Ensure logs don't fill disk
3. **Use structured logging**: Easier to parse and analyze
4. **Set up alerts**: Alert on high error rates or slow responses
5. **Regular log review**: Review logs for security issues

## Configuration

No configuration required - logging is enabled by default. To disable:

```typescript
// In app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Comment out to disable logging
    // consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
```

## Log Analysis Examples

### Find slow requests
```bash
grep "RESPONSE" logs/requests.log | grep -E "[0-9]{3,}ms"
```

### Find errors by user
```bash
grep "ERROR" logs/requests.log | grep "User: user-uuid-123"
```

### Count requests per endpoint
```bash
grep "REQUEST" logs/requests.log | awk '{print $4}' | sort | uniq -c
```

### Find requests from specific IP
```bash
grep "ip.*192.168.1.1" logs/requests.log
```

