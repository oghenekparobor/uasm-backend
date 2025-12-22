# Pagination Documentation

## Overview

All list endpoints now support pagination using query parameters. Pagination is consistent across all endpoints and provides metadata for building pagination UI.

## Query Parameters

### Page-based Pagination (Default)

- `page` (optional): Page number (default: 1, minimum: 1)
- `limit` (optional): Items per page (default: 20, maximum: 100)

**Example:**
```
GET /users?page=2&limit=10
```

### Skip/Take Pagination (Alternative)

- `skip` (optional): Number of items to skip (default: 0, minimum: 0)
- `take` (optional): Number of items to take (default: 20, maximum: 100)

**Example:**
```
GET /users?skip=20&take=10
```

**Note:** If both `skip/take` and `page/limit` are provided, `skip/take` takes precedence.

## Response Format

All paginated endpoints return responses in this format:

```json
{
  "data": [
    // ... array of items
  ],
  "meta": {
    "page": 2,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": true
  }
}
```

### Meta Fields

- `page`: Current page number
- `limit`: Items per page
- `total`: Total number of items (after RLS filtering)
- `totalPages`: Total number of pages
- `hasNext`: Whether there is a next page
- `hasPrevious`: Whether there is a previous page

## Endpoints with Pagination

### Users
- `GET /users` - List all users

### Members
- `GET /members` - List all members

### Classes
- `GET /classes` - List all classes

### Attendance
- `GET /attendance` - List all attendance records
- `GET /attendance/classes/:classId` - List class attendance

### Activity Logs
- `GET /activity-logs` - List all activity logs
- `GET /activity-logs/me` - List my activity logs

### Requests
- `GET /requests` - List all requests
- `GET /requests/my` - List my requests

### Events
- `GET /events` - List all events

### Empowerment
- `GET /empowerment` - List all empowerment requests

### Member Logs
- `GET /members/:id/logs` - List member logs

### Notifications
- `GET /notifications` - List notifications

### Distribution
- `GET /distribution/batches` - List distribution batches
- `GET /distribution/allocations` - List allocations

### Kitchen
- `GET /kitchen/recipes` - List recipes
- `GET /kitchen/production` - List production logs

## Usage Examples

### Basic Pagination

```bash
# Get first page (20 items)
GET /users

# Get second page (20 items)
GET /users?page=2

# Get first page with 10 items
GET /users?page=1&limit=10
```

### Skip/Take Pagination

```bash
# Skip first 20 items, take next 10
GET /users?skip=20&take=10
```

### Combined with Filters

```bash
# Paginated filtered results
GET /requests?status=PENDING&page=1&limit=10
GET /attendance?classId=xxx&windowId=yyy&page=2&limit=20
GET /activity-logs?actorId=zzz&page=1&limit=50
```

## Frontend Integration

### React Example

```typescript
const [page, setPage] = useState(1);
const [limit, setLimit] = useState(20);
const [data, setData] = useState([]);
const [meta, setMeta] = useState(null);

useEffect(() => {
  fetch(`/users?page=${page}&limit=${limit}`)
    .then(res => res.json())
    .then(result => {
      setData(result.data);
      setMeta(result.meta);
    });
}, [page, limit]);

// Render pagination controls
{meta && (
  <div>
    <button 
      disabled={!meta.hasPrevious}
      onClick={() => setPage(page - 1)}
    >
      Previous
    </button>
    <span>Page {meta.page} of {meta.totalPages}</span>
    <button 
      disabled={!meta.hasNext}
      onClick={() => setPage(page + 1)}
    >
      Next
    </button>
  </div>
)}
```

## Validation

- `page`: Must be >= 1
- `limit`: Must be >= 1 and <= 100
- `skip`: Must be >= 0
- `take`: Must be >= 1 and <= 100

Invalid values will result in validation errors.

## RLS Considerations

Pagination counts (`total`) are calculated **after** RLS filtering. This means:
- Users only see counts for data they have access to
- Pagination metadata reflects their filtered view
- Total counts may differ between users based on their roles/permissions

## Performance

- Pagination uses database-level `LIMIT` and `OFFSET` (or `SKIP`/`TAKE`)
- Total counts use `COUNT()` queries
- Both queries respect RLS policies
- For large datasets, consider using cursor-based pagination in the future

