# Health Check Endpoints

## Overview

Health check endpoints for monitoring application status and database connectivity.

## Endpoints

### GET `/health`

Comprehensive health check including database connectivity and service status.

**Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 5
    },
    "cloudinary": {
      "status": "up"
    }
  },
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Response (Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "down",
      "error": "Database connection failed"
    }
  },
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Status Codes:**
- `200 OK`: Health check completed (may be healthy or unhealthy)
- `503 Service Unavailable`: Service is down (optional, can be configured)

### GET `/ping`

Simple ping endpoint for basic connectivity check.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Code:**
- `200 OK`: Service is responding

## Health Checks

### Database Check

- Executes `SELECT 1` query
- Measures response time
- Returns `up` or `down` status

### Cloudinary Check

- Checks if Cloudinary credentials are configured
- Returns:
  - `up`: Credentials present
  - `not_configured`: Credentials missing (not an error)
  - `down`: Configuration error

## Usage

### Monitoring

Use `/health` endpoint for:
- Load balancer health checks
- Kubernetes liveness/readiness probes
- Monitoring tools (Prometheus, Datadog, etc.)
- CI/CD deployment verification

Use `/ping` endpoint for:
- Simple connectivity checks
- Basic uptime monitoring
- Quick status verification

### Example: Kubernetes Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Example: Kubernetes Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Example: Load Balancer Health Check

```nginx
location /health {
    proxy_pass http://backend/health;
    access_log off;
}
```

## Response Fields

- **status**: Overall health status (`healthy` or `unhealthy`)
- **timestamp**: ISO 8601 timestamp of check
- **checks**: Individual service checks
  - **database**: Database connectivity status
  - **cloudinary**: Cloudinary configuration status (optional)
- **uptime**: Server uptime in seconds
- **version**: Application version (from `APP_VERSION` env var, defaults to `1.0.0`)

## Environment Variables

Optional:
- `APP_VERSION`: Application version string (defaults to `1.0.0`)

## Monitoring Integration

### Prometheus

The health endpoint can be scraped by Prometheus:

```yaml
scrape_configs:
  - job_name: 'uams-backend'
    metrics_path: '/health'
    static_configs:
      - targets: ['localhost:3000']
```

### Custom Monitoring

You can parse the JSON response to:
- Alert on `status: "unhealthy"`
- Track `uptime` for availability metrics
- Monitor `responseTime` for database performance
- Track individual check statuses

## Best Practices

1. **Don't require authentication**: Health checks should be publicly accessible
2. **Keep it fast**: Health checks should complete quickly (< 1 second)
3. **Don't log excessively**: Health checks are called frequently
4. **Use appropriate timeouts**: Set reasonable timeouts for external checks
5. **Return appropriate status codes**: Use 200 for healthy, 503 for unhealthy (optional)

