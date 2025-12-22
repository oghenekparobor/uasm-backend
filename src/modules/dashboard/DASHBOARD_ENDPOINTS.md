# Dashboard Endpoints Documentation

## Overview

Dashboard endpoints provide aggregated statistics and counts for the UAMS system. Statistics are filtered based on user role and RLS policies.

## Endpoints

### 1. Get Dashboard Statistics
**GET** `/dashboard/stats`

Get comprehensive dashboard statistics. Returns different stats based on user role.

**Headers:**
- `Authorization: Bearer {access_token}`

**Query Parameters:**
- `period` (optional): Filter by time period
  - `today` - Today's data
  - `week` - Last 7 days
  - `month` - Last 30 days
  - `year` - Last 365 days
  - `all` - All time (default)

**Response (Admin/Super Admin):**
```json
{
  "totalUsers": 50,
  "totalMembers": 500,
  "totalClasses": 20,
  "pendingApprovals": {
    "empowermentRequests": 5,
    "generalRequests": 3,
    "events": 2,
    "total": 10
  },
  "recentActivity": [
    {
      "id": "log-id",
      "action": "ATTENDANCE_SUBMITTED",
      "entityType": "class_attendance",
      "createdAt": "2025-12-22T10:00:00Z",
      "actor": {
        "id": "user-id",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ],
  "systemStats": {
    "totalEmpowermentRequests": {
      "total": 100,
      "pending": 5,
      "approved": 85,
      "rejected": 10
    },
    "totalRequests": {
      "total": 50,
      "pending": 3,
      "approved": 40,
      "rejected": 7
    },
    "totalEvents": {
      "total": 30,
      "pending": 2,
      "approved": 28
    },
    "attendanceStats": {
      "totalRecords": 200,
      "totalAttendance": 5000,
      "averagePerRecord": 25,
      "byClass": [
        {
          "classId": "class-id",
          "className": "Platoon Alpha",
          "classType": "PLATOON",
          "totalAttendance": 100,
          "records": 4
        }
      ]
    },
    "distributionStats": {
      "totalBatches": 10,
      "totalFoodReceived": 10000,
      "totalWaterReceived": 5000,
      "totalFoodAllocated": 9500,
      "totalWaterAllocated": 4800,
      "foodRemaining": 500,
      "waterRemaining": 200
    }
  },
  "distributionStats": {
    "totalBatches": 10,
    "totalFoodReceived": 10000,
    "totalWaterReceived": 5000,
    "totalFoodAllocated": 9500,
    "totalWaterAllocated": 4800,
    "foodRemaining": 500,
    "waterRemaining": 200
  },
  "kitchenStats": {
    "totalRecipes": 5,
    "totalProductionLogs": 50,
    "totalProduction": 5000,
    "averageProduction": 100
  },
  "platoonStats": {
    "totalMembers": 50,
    "totalAttendance": 1200,
    "totalLogs": 30,
    "totalEmpowerments": 10,
    "platoonIds": ["platoon-id-1", "platoon-id-2"]
  },
  "period": "all"
}
```

**Response (Leader/Teacher):**
```json
{
  "totalUsers": 10,
  "totalMembers": 50,
  "totalClasses": 2,
  "pendingApprovals": {
    "empowermentRequests": 2,
    "generalRequests": 0,
    "events": 1,
    "total": 3
  },
  "recentActivity": [...],
  "platoonStats": {
    "totalMembers": 50,
    "totalAttendance": 1200,
    "totalLogs": 30,
    "totalEmpowerments": 10,
    "platoonIds": ["platoon-id-1"]
  },
  "period": "all"
}
```

**Response (Distribution):**
```json
{
  "totalUsers": 10,
  "totalMembers": 500,
  "totalClasses": 20,
  "pendingApprovals": {...},
  "recentActivity": [...],
  "distributionStats": {
    "totalBatches": 10,
    "totalFoodReceived": 10000,
    "totalWaterReceived": 5000,
    "totalFoodAllocated": 9500,
    "totalWaterAllocated": 4800,
    "foodRemaining": 500,
    "waterRemaining": 200
  },
  "period": "all"
}
```

**Response (Kitchen):**
```json
{
  "totalUsers": 5,
  "totalMembers": 500,
  "totalClasses": 20,
  "pendingApprovals": {...},
  "recentActivity": [...],
  "kitchenStats": {
    "totalRecipes": 5,
    "totalProductionLogs": 50,
    "totalProduction": 5000,
    "averageProduction": 100
  },
  "period": "all"
}
```

### 2. Get Overview (Quick Stats)
**GET** `/dashboard/overview`

Get quick overview statistics (counts only). Faster endpoint for dashboard widgets.

**Headers:**
- `Authorization: Bearer {access_token}`

**Response:**
```json
{
  "users": 50,
  "members": 500,
  "classes": 20,
  "pendingEmpowerments": 5,
  "pendingRequests": 3,
  "pendingEvents": 2
}
```

## Role-Based Access

### Admin/Super Admin
- See all system-wide statistics
- Access to all modules' statistics
- Full visibility into all entities

### Distribution Role
- See distribution-related statistics
- Access to food/water allocation data
- Cannot see kitchen or platoon-specific stats

### Kitchen Role
- See kitchen-related statistics
- Access to production logs and recipes
- Cannot see distribution or platoon-specific stats

### Leaders/Teachers
- See statistics for their assigned platoons only
- Access to member, attendance, and log statistics for their platoons
- Cannot see system-wide statistics

## Usage Examples

### Get Today's Statistics
```bash
GET /dashboard/stats?period=today
```

### Get Last Week's Statistics
```bash
GET /dashboard/stats?period=week
```

### Get Quick Overview
```bash
GET /dashboard/overview
```

## Notes

- All statistics respect RLS policies
- Data is filtered based on user role and permissions
- Statistics are calculated in real-time (not cached)
- Large date ranges may take longer to calculate
- Use `/dashboard/overview` for faster responses when only counts are needed

