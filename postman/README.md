# UAMS API Postman Collection

This Postman collection contains all API endpoints for the Urban Alternative Management System (UAMS).

## Setup

1. **Import the Collection**
   - Open Postman
   - Click "Import" button
   - Select `UAMS_API.postman_collection.json`

2. **Configure Environment Variables**
   - Create a new environment or use the default
   - Set the following variables:
     - `base_url`: `http://localhost:3000` (or your API URL)
     - `access_token`: Will be set automatically after login
     - `refresh_token`: Will be set automatically after login

3. **Auto-set Tokens (Optional)**
   - You can add a test script to the Login request to automatically set tokens:
   ```javascript
   if (pm.response.code === 200) {
       const jsonData = pm.response.json();
       pm.environment.set("access_token", jsonData.accessToken);
       pm.environment.set("refresh_token", jsonData.refreshToken);
   }
   ```

## Test Credentials

Use the seeded test data:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@uams.test` | `password123` |
| Admin | `admin@uams.test` | `password123` |
| Leader | `leader@uams.test` | `password123` |
| Distribution | `distribution@uams.test` | `password123` |
| Kitchen | `kitchen@uams.test` | `password123` |

## Collection Structure

The collection is organized into the following folders:

1. **Auth** - Authentication endpoints
2. **Users & Roles** - User management and role assignment
3. **Classes** - Class/Platoon management
4. **Members** - Member (beneficiary) management
5. **Attendance** - Attendance tracking
6. **Kitchen** - Kitchen recipes and production logs
7. **Distribution** - Food and water distribution
8. **Empowerment** - Empowerment requests
9. **Member Logs** - Member activity logs
10. **Requests** - General requests system
11. **Events** - Event management
12. **Notifications** - User notifications
13. **Activity Logs** - Audit logs

## Usage Tips

1. **Start with Login**: Always authenticate first using the Login endpoint
2. **Replace UUIDs**: Replace placeholder UUIDs (`user-uuid-here`, `member-uuid-here`, etc.) with actual IDs from your database
3. **Check Permissions**: Different roles have different access levels (enforced by RLS)
4. **Use Seed Data**: Run the seed script to get test data with known UUIDs

## Example Workflow

1. Login as super admin
2. Create a new class
3. Create members in that class
4. Open an attendance window
5. Submit attendance for the class
6. Create a distribution batch
7. Allocate food/water to classes

## Notes

- All endpoints require authentication except `/auth/login` and `/auth/refresh`
- Authorization is handled by Row Level Security (RLS) in PostgreSQL
- Replace all placeholder UUIDs with actual values from your database
- The collection uses environment variables for easy configuration

