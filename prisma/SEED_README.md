# Seed Data Documentation

This seed script creates controlled test data for QA, demo, and regression testing.

## Usage

```bash
# Run the seed script
npm run prisma:seed

# Or directly with ts-node
npx ts-node prisma/seed.ts
```

## Test Users Created

All users have the password: **`password123`**

| Role | Email | Description |
|------|-------|-------------|
| Super Admin | `superadmin@uams.test` | Full system access |
| Admin | `admin@uams.test` | Operational admin (cannot remove super admins) |
| Platoon Leader | `leader@uams.test` | Manages 2 platoons (Alpha & Beta) |
| Distribution | `distribution@uams.test` | Handles food/water distribution |
| Kitchen | `kitchen@uams.test` | Manages kitchen operations |

## Test Data Created

### Classes/Platoons
- **Platoon Alpha** (`00000000-0000-0000-0000-00000000aaaa`) - 5 members
- **Platoon Beta** (`00000000-0000-0000-0000-00000000bbbb`) - 5 members
- **Children's Class A** (`00000000-0000-0000-0000-00000000cccc`) - 5 children

### Members
- **10 Adult Members** (5 per platoon)
- **5 Children Members** (in children's class)

### Kitchen Recipes
- Sunday Meal Pack
- Snack Pack

## JWT Claims for Testing

When generating JWTs for the platoon leader, use:

```json
{
  "sub": "<leader_user_id>",
  "role": "platoon_leader",
  "worker_id": "<leader_user_id>",
  "platoon_ids": [
    "00000000-0000-0000-0000-00000000aaaa",
    "00000000-0000-0000-0000-00000000bbbb"
  ]
}
```

## Use Cases

### QA Testing
- Test RLS policies with different roles
- Verify class-scoped access for leaders
- Test approval workflows

### Demo
- Showcase different user roles and permissions
- Demonstrate member management
- Show attendance and distribution workflows

### Regression Tests
- Consistent test data across environments
- Predictable UUIDs for integration tests
- Known user/class relationships

## Notes

- The seed script uses `upsert` operations, so it's safe to run multiple times
- All UUIDs are fixed for consistency
- Members have realistic names and birthdays
- The leader is assigned to both platoons for testing multi-platoon scenarios

