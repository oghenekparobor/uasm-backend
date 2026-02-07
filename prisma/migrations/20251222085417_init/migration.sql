-- Prisma-style initial migration for UAMS schema
-- This was created without connecting to a live database.

-- 1. Core Identity & Access Control

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "first_name" VARCHAR NOT NULL,
  "last_name" VARCHAR NOT NULL,
  "email" VARCHAR NOT NULL UNIQUE,
  "phone" VARCHAR,
  "password_hash" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_users_active" ON "users" ("is_active");

CREATE TABLE "roles" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR NOT NULL UNIQUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "user_roles" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role_id" INT NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "assigned_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "user_roles_user_role_unique" UNIQUE ("user_id", "role_id")
);

CREATE INDEX "idx_user_roles_user" ON "user_roles" ("user_id");
CREATE INDEX "idx_user_roles_role" ON "user_roles" ("role_id");

-- 2. Classes

CREATE TYPE "ClassType" AS ENUM ('PLATOON', 'CHILDREN');
CREATE TYPE "LeaderRole" AS ENUM ('LEADER', 'ASSISTANT', 'TEACHER');

CREATE TABLE "classes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR NOT NULL,
  "type" "ClassType" NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_classes_type" ON "classes" ("type");

CREATE TABLE "class_leaders" (
  "id" SERIAL PRIMARY KEY,
  "class_id" UUID NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "LeaderRole" NOT NULL,
  CONSTRAINT "class_leaders_unique" UNIQUE ("class_id", "user_id", "role")
);

CREATE INDEX "idx_class_leaders_class" ON "class_leaders" ("class_id");
CREATE INDEX "idx_class_leaders_user" ON "class_leaders" ("user_id");

-- 3. Members

CREATE TABLE "members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "first_name" VARCHAR NOT NULL,
  "last_name" VARCHAR NOT NULL,
  "birthday" DATE,
  "current_class_id" UUID NOT NULL REFERENCES "classes"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_members_class" ON "members" ("current_class_id");
CREATE INDEX "idx_members_birthday" ON "members" ("birthday");

CREATE TABLE "member_class_history" (
  "id" SERIAL PRIMARY KEY,
  "member_id" UUID NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "from_class_id" UUID,
  "to_class_id" UUID NOT NULL REFERENCES "classes"("id"),
  "transferred_by" UUID NOT NULL REFERENCES "users"("id"),
  "transferred_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_member_history_member" ON "member_class_history" ("member_id");
CREATE INDEX "idx_member_history_date" ON "member_class_history" ("transferred_at");

-- 4. Attendance

CREATE TABLE "attendance_windows" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sunday_date" DATE NOT NULL UNIQUE,
  "opens_at" TIMESTAMP NOT NULL,
  "closes_at" TIMESTAMP NOT NULL,
  "created_by" UUID NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "class_attendance" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "class_id" UUID NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "attendance_window_id" UUID NOT NULL REFERENCES "attendance_windows"("id") ON DELETE CASCADE,
  "count" INT NOT NULL,
  "taken_by" UUID NOT NULL REFERENCES "users"("id"),
  "taken_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "class_attendance_unique" UNIQUE ("class_id", "attendance_window_id")
);

CREATE INDEX "idx_attendance_class" ON "class_attendance" ("class_id");
CREATE INDEX "idx_attendance_window" ON "class_attendance" ("attendance_window_id");

-- 5. Kitchen

CREATE TABLE "kitchen_recipes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "kitchen_production_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipe_id" UUID NOT NULL REFERENCES "kitchen_recipes"("id") ON DELETE CASCADE,
  "quantity" INT NOT NULL,
  "week_date" DATE NOT NULL,
  "logged_by" UUID NOT NULL REFERENCES "users"("id"),
  "logged_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_kitchen_week" ON "kitchen_production_logs" ("week_date");

-- 6. Distribution

CREATE TYPE "AllocationType" AS ENUM ('DEFAULT', 'EXTRA');

CREATE TABLE "distribution_batches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "attendance_window_id" UUID NOT NULL REFERENCES "attendance_windows"("id") ON DELETE CASCADE,
  "total_food_received" INT NOT NULL,
  "total_water_received" INT NOT NULL,
  "confirmed_by" UUID NOT NULL REFERENCES "users"("id"),
  "confirmed_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_distribution_window" ON "distribution_batches" ("attendance_window_id");

CREATE TABLE "class_distributions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "distribution_batch_id" UUID NOT NULL REFERENCES "distribution_batches"("id") ON DELETE CASCADE,
  "class_id" UUID NOT NULL REFERENCES "classes"("id"),
  "food_allocated" INT NOT NULL,
  "water_allocated" INT NOT NULL,
  "allocation_type" "AllocationType" NOT NULL,
  "distributed_by" UUID NOT NULL REFERENCES "users"("id"),
  "distributed_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_class_distribution_class" ON "class_distributions" ("class_id");
CREATE INDEX "idx_class_distribution_batch" ON "class_distributions" ("distribution_batch_id");

-- 7. Empowerment

CREATE TYPE "EmpowermentType" AS ENUM ('SKILL', 'MONEY', 'DRUG', 'ITEM');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "empowerment_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "member_id" UUID NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "type" "EmpowermentType" NOT NULL,
  "description" TEXT,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "requested_by" UUID NOT NULL REFERENCES "users"("id"),
  "approved_by" UUID REFERENCES "users"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "approved_at" TIMESTAMP
);

CREATE INDEX "idx_empowerment_member" ON "empowerment_requests" ("member_id");
CREATE INDEX "idx_empowerment_status" ON "empowerment_requests" ("status");

-- 8. Member Logs

CREATE TYPE "FileType" AS ENUM ('IMAGE', 'PDF');

CREATE TABLE "member_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "member_id" UUID NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "created_by" UUID NOT NULL REFERENCES "users"("id"),
  "note" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_member_logs_member" ON "member_logs" ("member_id");

CREATE TABLE "member_log_attachments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "member_log_id" UUID NOT NULL REFERENCES "member_logs"("id") ON DELETE CASCADE,
  "file_url" TEXT NOT NULL,
  "file_type" "FileType" NOT NULL,
  "file_size" INT NOT NULL
);

-- 9. Requests (General)

CREATE TABLE "requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" VARCHAR NOT NULL,
  "description" TEXT,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "requested_by" UUID NOT NULL REFERENCES "users"("id"),
  "handled_by" UUID REFERENCES "users"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "resolved_at" TIMESTAMP
);

CREATE INDEX "idx_requests_status" ON "requests" ("status");
CREATE INDEX "idx_requests_type" ON "requests" ("type");

-- 10. Events

CREATE TYPE "EventScope" AS ENUM ('GLOBAL', 'CLASS');
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'APPROVED');

CREATE TABLE "events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" VARCHAR NOT NULL,
  "description" TEXT,
  "scope" "EventScope" NOT NULL,
  "class_id" UUID REFERENCES "classes"("id"),
  "is_recurring" BOOLEAN NOT NULL DEFAULT FALSE,
  "requires_approval" BOOLEAN NOT NULL DEFAULT FALSE,
  "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
  "created_by" UUID NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_events_scope" ON "events" ("scope");
CREATE INDEX "idx_events_class" ON "events" ("class_id");

CREATE TABLE "event_attendance" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "member_id" UUID NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "attended" BOOLEAN NOT NULL DEFAULT FALSE
);

-- 11. Notifications

CREATE TABLE "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" VARCHAR NOT NULL,
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_notifications_user" ON "notifications" ("user_id");
CREATE INDEX "idx_notifications_unread" ON "notifications" ("is_read");

-- 12. Activity Logs

CREATE TABLE "activity_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_id" UUID NOT NULL REFERENCES "users"("id"),
  "action" VARCHAR NOT NULL,
  "entity_type" VARCHAR NOT NULL,
  "entity_id" UUID,
  "metadata" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_activity_actor" ON "activity_logs" ("actor_id");
CREATE INDEX "idx_activity_entity" ON "activity_logs" ("entity_type", "entity_id");
CREATE INDEX "idx_activity_date" ON "activity_logs" ("created_at");

