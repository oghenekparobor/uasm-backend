# Search and Filtering Documentation

## Overview

All list endpoints support advanced search and filtering capabilities including text search, date range filtering, and custom sorting.

## Common Filter Parameters

All list endpoints support these common filter parameters:

### Text Search
- `search` (string): Search term to find in multiple fields
- `searchFields` (string): Comma-separated list of fields to search in (e.g., "firstName,lastName,email")

### Date Range Filtering
- `dateFrom` (ISO date string): Filter records created/modified from this date
- `dateTo` (ISO date string): Filter records created/modified until this date

### Sorting
- `sortBy` (string): Field name to sort by
- `sortOrder` (enum: "asc" | "desc"): Sort direction (default: "asc" for most endpoints, "desc" for logs)

### Pagination
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `skip` (number): Number of items to skip
- `take` (number): Number of items to take

## Endpoint-Specific Filters

### Users (`GET /users`)

**Additional Filters:**
- `email` (string): Filter by email (partial match, case-insensitive)
- `firstName` (string): Filter by first name (partial match, case-insensitive)
- `lastName` (string): Filter by last name (partial match, case-insensitive)
- `isActive` (boolean): Filter by active status

**Default Search Fields:** `firstName,lastName,email`

**Default Sort:** `lastName` ascending

**Example:**
```bash
GET /users?search=john&searchFields=firstName,lastName&isActive=true&sortBy=createdAt&sortOrder=desc&dateFrom=2024-01-01&page=1&limit=20
```

### Members (`GET /members`)

**Additional Filters:**
- `firstName` (string): Filter by first name (partial match, case-insensitive)
- `lastName` (string): Filter by last name (partial match, case-insensitive)
- `currentClassId` (UUID): Filter by current class/platoon

**Default Search Fields:** `firstName,lastName`

**Default Sort:** `lastName` ascending

**Example:**
```bash
GET /members?search=smith&currentClassId=xxx&dateFrom=2024-01-01&sortBy=firstName&page=1&limit=50
```

### Requests (`GET /requests`)

**Additional Filters:**
- `status` (enum): Filter by request status (PENDING, APPROVED, REJECTED)

**Default Search Fields:** `description,type`

**Default Sort:** `createdAt` descending

**Example:**
```bash
GET /requests?status=PENDING&search=leave&dateFrom=2024-01-01&dateTo=2024-12-31&sortBy=createdAt&sortOrder=asc
```

### Activity Logs (`GET /activity-logs`)

**Additional Filters:**
- `actorId` (UUID): Filter by actor/user ID
- `entityType` (string): Filter by entity type
- `entityId` (UUID): Filter by entity ID

**Default Sort:** `createdAt` descending

**Example:**
```bash
GET /activity-logs?actorId=xxx&entityType=member&dateFrom=2024-01-01&dateTo=2024-01-31&page=1&limit=100
```

### Attendance (`GET /attendance`)

**Additional Filters:**
- `classId` (UUID): Filter by class/platoon
- `windowId` (UUID): Filter by attendance window

**Default Sort:** `takenAt` descending

**Date Range:** Filters on `takenAt` field

**Example:**
```bash
GET /attendance?classId=xxx&windowId=yyy&dateFrom=2024-01-01&dateTo=2024-01-31&sortBy=takenAt&sortOrder=asc
```

## Usage Examples

### Basic Text Search

```bash
# Search users by name or email
GET /users?search=john

# Search members by name
GET /members?search=smith

# Search requests by description
GET /requests?search=leave
```

### Advanced Text Search

```bash
# Search in specific fields
GET /users?search=john&searchFields=firstName,lastName

# Search in email only
GET /users?search=example.com&searchFields=email
```

### Date Range Filtering

```bash
# Get records created in January 2024
GET /users?dateFrom=2024-01-01&dateTo=2024-01-31

# Get records created after a date
GET /activity-logs?dateFrom=2024-01-01

# Get records created before a date
GET /requests?dateTo=2024-12-31
```

### Combined Filters

```bash
# Search active users created in 2024, sorted by creation date
GET /users?search=john&isActive=true&dateFrom=2024-01-01&dateTo=2024-12-31&sortBy=createdAt&sortOrder=desc&page=1&limit=20

# Get pending requests from last month
GET /requests?status=PENDING&dateFrom=2024-01-01&dateTo=2024-01-31&sortBy=createdAt&sortOrder=asc

# Get activity logs for a specific user in date range
GET /activity-logs?actorId=xxx&dateFrom=2024-01-01&dateTo=2024-01-31&page=1&limit=50
```

### Sorting

```bash
# Sort users by email ascending
GET /users?sortBy=email&sortOrder=asc

# Sort members by first name descending
GET /members?sortBy=firstName&sortOrder=desc

# Sort requests by creation date (newest first)
GET /requests?sortBy=createdAt&sortOrder=desc
```

## Response Format

Filtered results follow the same paginated response format:

```json
{
  "data": [
    // ... filtered items
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## Search Behavior

- **Case-insensitive**: All text searches are case-insensitive
- **Partial matching**: Searches use "contains" matching (not exact match)
- **Multiple fields**: When `search` is provided, it searches across all specified `searchFields` using OR logic
- **Field-specific filters**: When specific field filters are provided (e.g., `firstName`), they use AND logic with other filters

## Date Format

Dates should be provided in ISO 8601 format:
- `YYYY-MM-DD` (e.g., `2024-01-15`)
- `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g., `2024-01-15T10:30:00.000Z`)

The `dateTo` parameter is inclusive - it includes the entire day (up to 23:59:59.999).

## Performance Considerations

- Text search uses database-level `LIKE` queries with case-insensitive matching
- Date range filters use indexed date fields for optimal performance
- Combined filters are optimized by Prisma query builder
- RLS policies are applied before filtering, ensuring security

## RLS Considerations

- All filters respect Row Level Security policies
- Users only see filtered results they have access to
- Total counts reflect filtered, RLS-filtered data
- Search results are limited to accessible records

## Best Practices

1. **Use specific field filters when possible** - More efficient than broad text search
2. **Combine filters** - Use multiple filters together for precise results
3. **Use date ranges** - Limit date ranges to improve query performance
4. **Set reasonable limits** - Use pagination to limit result sets
5. **Use searchFields** - Specify fields to search in for better performance

## Frontend Integration Example

```typescript
interface FilterParams {
  search?: string;
  searchFields?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  // Endpoint-specific filters
  [key: string]: any;
}

async function fetchUsers(filters: FilterParams) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const response = await fetch(`/users?${params.toString()}`);
  return response.json();
}

// Usage
const users = await fetchUsers({
  search: 'john',
  searchFields: 'firstName,lastName',
  isActive: true,
  dateFrom: '2024-01-01',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
});
```

