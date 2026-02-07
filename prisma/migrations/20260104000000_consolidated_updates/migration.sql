-- ============================================
-- Consolidated Migration: Member Attendance, Class Offerings, and Event Date
-- This migration combines:
-- 1. Creating member_attendance table
-- 2. Converting all UUID columns to TEXT (from add_class_offerings migration)
-- 3. Creating class_offerings table
-- 4. Adding event_date to events table
-- ============================================

-- Step 1: Drop all foreign keys from existing tables (before converting UUIDs to TEXT)
ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_actor_id_fkey";
ALTER TABLE "attendance_windows" DROP CONSTRAINT IF EXISTS "attendance_windows_created_by_fkey";
ALTER TABLE "class_attendance" DROP CONSTRAINT IF EXISTS "class_attendance_attendance_window_id_fkey";
ALTER TABLE "class_attendance" DROP CONSTRAINT IF EXISTS "class_attendance_class_id_fkey";
ALTER TABLE "class_attendance" DROP CONSTRAINT IF EXISTS "class_attendance_taken_by_fkey";
ALTER TABLE "class_distributions" DROP CONSTRAINT IF EXISTS "class_distributions_class_id_fkey";
ALTER TABLE "class_distributions" DROP CONSTRAINT IF EXISTS "class_distributions_distributed_by_fkey";
ALTER TABLE "class_distributions" DROP CONSTRAINT IF EXISTS "class_distributions_distribution_batch_id_fkey";
ALTER TABLE "class_leaders" DROP CONSTRAINT IF EXISTS "class_leaders_class_id_fkey";
ALTER TABLE "class_leaders" DROP CONSTRAINT IF EXISTS "class_leaders_user_id_fkey";
ALTER TABLE "distribution_batches" DROP CONSTRAINT IF EXISTS "distribution_batches_attendance_window_id_fkey";
ALTER TABLE "distribution_batches" DROP CONSTRAINT IF EXISTS "distribution_batches_confirmed_by_fkey";
ALTER TABLE "empowerment_requests" DROP CONSTRAINT IF EXISTS "empowerment_requests_approved_by_fkey";
ALTER TABLE "empowerment_requests" DROP CONSTRAINT IF EXISTS "empowerment_requests_member_id_fkey";
ALTER TABLE "empowerment_requests" DROP CONSTRAINT IF EXISTS "empowerment_requests_requested_by_fkey";
ALTER TABLE "event_attendance" DROP CONSTRAINT IF EXISTS "event_attendance_event_id_fkey";
ALTER TABLE "event_attendance" DROP CONSTRAINT IF EXISTS "event_attendance_member_id_fkey";
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_class_id_fkey";
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_created_by_fkey";
ALTER TABLE "kitchen_production_logs" DROP CONSTRAINT IF EXISTS "kitchen_production_logs_logged_by_fkey";
ALTER TABLE "kitchen_production_logs" DROP CONSTRAINT IF EXISTS "kitchen_production_logs_recipe_id_fkey";
ALTER TABLE "member_class_history" DROP CONSTRAINT IF EXISTS "member_class_history_member_id_fkey";
ALTER TABLE "member_class_history" DROP CONSTRAINT IF EXISTS "member_class_history_to_class_id_fkey";
ALTER TABLE "member_class_history" DROP CONSTRAINT IF EXISTS "member_class_history_transferred_by_fkey";
ALTER TABLE "member_log_attachments" DROP CONSTRAINT IF EXISTS "member_log_attachments_member_log_id_fkey";
ALTER TABLE "member_logs" DROP CONSTRAINT IF EXISTS "member_logs_created_by_fkey";
ALTER TABLE "member_logs" DROP CONSTRAINT IF EXISTS "member_logs_member_id_fkey";
ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_current_class_id_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_fkey";
ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_handled_by_fkey";
ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_requested_by_fkey";
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_role_id_fkey";
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_user_id_fkey";

-- Step 2: Convert all UUID columns to TEXT and update primary keys
ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "actor_id" SET DATA TYPE TEXT USING actor_id::TEXT,
ALTER COLUMN "action" SET DATA TYPE TEXT,
ALTER COLUMN "entity_type" SET DATA TYPE TEXT,
ALTER COLUMN "entity_id" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");

ALTER TABLE "attendance_windows" DROP CONSTRAINT IF EXISTS "attendance_windows_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "opens_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "closes_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_by" SET DATA TYPE TEXT USING created_by::TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "attendance_windows_pkey" PRIMARY KEY ("id");

ALTER TABLE "class_attendance" DROP CONSTRAINT IF EXISTS "class_attendance_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "class_id" SET DATA TYPE TEXT USING class_id::TEXT,
ALTER COLUMN "attendance_window_id" SET DATA TYPE TEXT USING attendance_window_id::TEXT,
ALTER COLUMN "taken_by" SET DATA TYPE TEXT USING taken_by::TEXT,
ALTER COLUMN "taken_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "class_attendance_pkey" PRIMARY KEY ("id");

ALTER TABLE "class_distributions" DROP CONSTRAINT IF EXISTS "class_distributions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "distribution_batch_id" SET DATA TYPE TEXT USING distribution_batch_id::TEXT,
ALTER COLUMN "class_id" SET DATA TYPE TEXT USING class_id::TEXT,
ALTER COLUMN "distributed_by" SET DATA TYPE TEXT USING distributed_by::TEXT,
ALTER COLUMN "distributed_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "class_distributions_pkey" PRIMARY KEY ("id");

ALTER TABLE "class_leaders" ALTER COLUMN "class_id" SET DATA TYPE TEXT USING class_id::TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT USING user_id::TEXT;

ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "classes_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");

ALTER TABLE "distribution_batches" DROP CONSTRAINT IF EXISTS "distribution_batches_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "attendance_window_id" SET DATA TYPE TEXT USING attendance_window_id::TEXT,
ALTER COLUMN "confirmed_by" SET DATA TYPE TEXT USING confirmed_by::TEXT,
ALTER COLUMN "confirmed_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "distribution_batches_pkey" PRIMARY KEY ("id");

ALTER TABLE "empowerment_requests" DROP CONSTRAINT IF EXISTS "empowerment_requests_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "member_id" SET DATA TYPE TEXT USING member_id::TEXT,
ALTER COLUMN "requested_by" SET DATA TYPE TEXT USING requested_by::TEXT,
ALTER COLUMN "approved_by" SET DATA TYPE TEXT USING approved_by::TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "approved_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "empowerment_requests_pkey" PRIMARY KEY ("id");

ALTER TABLE "event_attendance" DROP CONSTRAINT IF EXISTS "event_attendance_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "event_id" SET DATA TYPE TEXT USING event_id::TEXT,
ALTER COLUMN "member_id" SET DATA TYPE TEXT USING member_id::TEXT,
ADD CONSTRAINT "event_attendance_pkey" PRIMARY KEY ("id");

ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "title" SET DATA TYPE TEXT,
ALTER COLUMN "class_id" SET DATA TYPE TEXT USING class_id::TEXT,
ALTER COLUMN "created_by" SET DATA TYPE TEXT USING created_by::TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");

ALTER TABLE "kitchen_production_logs" DROP CONSTRAINT IF EXISTS "kitchen_production_logs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "recipe_id" SET DATA TYPE TEXT USING recipe_id::TEXT,
ALTER COLUMN "logged_by" SET DATA TYPE TEXT USING logged_by::TEXT,
ALTER COLUMN "logged_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "kitchen_production_logs_pkey" PRIMARY KEY ("id");

ALTER TABLE "kitchen_recipes" DROP CONSTRAINT IF EXISTS "kitchen_recipes_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "kitchen_recipes_pkey" PRIMARY KEY ("id");

ALTER TABLE "member_class_history" ALTER COLUMN "member_id" SET DATA TYPE TEXT USING member_id::TEXT,
ALTER COLUMN "from_class_id" SET DATA TYPE TEXT USING from_class_id::TEXT,
ALTER COLUMN "to_class_id" SET DATA TYPE TEXT USING to_class_id::TEXT,
ALTER COLUMN "transferred_by" SET DATA TYPE TEXT USING transferred_by::TEXT,
ALTER COLUMN "transferred_at" SET DATA TYPE TIMESTAMP(3);

ALTER TABLE "member_log_attachments" DROP CONSTRAINT IF EXISTS "member_log_attachments_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "member_log_id" SET DATA TYPE TEXT USING member_log_id::TEXT,
ADD CONSTRAINT "member_log_attachments_pkey" PRIMARY KEY ("id");

ALTER TABLE "member_logs" DROP CONSTRAINT IF EXISTS "member_logs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "member_id" SET DATA TYPE TEXT USING member_id::TEXT,
ALTER COLUMN "created_by" SET DATA TYPE TEXT USING created_by::TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "member_logs_pkey" PRIMARY KEY ("id");

ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "first_name" SET DATA TYPE TEXT,
ALTER COLUMN "last_name" SET DATA TYPE TEXT,
ALTER COLUMN "birthday" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "current_class_id" SET DATA TYPE TEXT USING current_class_id::TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");

ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT USING user_id::TEXT,
ALTER COLUMN "title" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "type" SET DATA TYPE TEXT,
ALTER COLUMN "requested_by" SET DATA TYPE TEXT USING requested_by::TEXT,
ALTER COLUMN "handled_by" SET DATA TYPE TEXT USING handled_by::TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "resolved_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("id");

ALTER TABLE "roles" ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

ALTER TABLE "user_roles" ALTER COLUMN "user_id" SET DATA TYPE TEXT USING user_id::TEXT,
ALTER COLUMN "assigned_at" SET DATA TYPE TIMESTAMP(3);

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ALTER COLUMN "first_name" SET DATA TYPE TEXT,
ALTER COLUMN "last_name" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "phone" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- Step 3: Create member_attendance table (now that all referenced tables use TEXT)
CREATE TABLE IF NOT EXISTS "member_attendance" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "member_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "attendance_window_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "marked_by" TEXT NOT NULL,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "member_attendance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "member_attendance_member_id_idx" ON "member_attendance"("member_id");
CREATE INDEX IF NOT EXISTS "member_attendance_class_id_idx" ON "member_attendance"("class_id");
CREATE INDEX IF NOT EXISTS "member_attendance_attendance_window_id_idx" ON "member_attendance"("attendance_window_id");
CREATE UNIQUE INDEX IF NOT EXISTS "member_attendance_member_id_attendance_window_id_key" ON "member_attendance"("member_id", "attendance_window_id");

-- Step 4: Create class_offerings table
CREATE TABLE IF NOT EXISTS "class_offerings" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "attendance_window_id" TEXT NOT NULL,
    "offering_amount" DECIMAL(10,2) NOT NULL,
    "tithe_amount" DECIMAL(10,2) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "class_offerings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "class_offerings_class_id_idx" ON "class_offerings"("class_id");
CREATE INDEX IF NOT EXISTS "class_offerings_attendance_window_id_idx" ON "class_offerings"("attendance_window_id");
CREATE INDEX IF NOT EXISTS "class_offerings_recorded_at_idx" ON "class_offerings"("recorded_at");
CREATE UNIQUE INDEX IF NOT EXISTS "class_offerings_class_id_attendance_window_id_key" ON "class_offerings"("class_id", "attendance_window_id");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");

-- Step 5: Add event_date to events table
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "event_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "events_event_date_idx" ON "events"("event_date");

-- Step 6: Re-add all foreign keys (now all columns are TEXT)
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_leaders" ADD CONSTRAINT "class_leaders_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_leaders" ADD CONSTRAINT "class_leaders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_current_class_id_fkey" FOREIGN KEY ("current_class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "member_class_history" ADD CONSTRAINT "member_class_history_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_class_history" ADD CONSTRAINT "member_class_history_from_class_id_fkey" FOREIGN KEY ("from_class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "member_class_history" ADD CONSTRAINT "member_class_history_to_class_id_fkey" FOREIGN KEY ("to_class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "member_class_history" ADD CONSTRAINT "member_class_history_transferred_by_fkey" FOREIGN KEY ("transferred_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_windows" ADD CONSTRAINT "attendance_windows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_attendance" ADD CONSTRAINT "class_attendance_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_attendance" ADD CONSTRAINT "class_attendance_attendance_window_id_fkey" FOREIGN KEY ("attendance_window_id") REFERENCES "attendance_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_attendance" ADD CONSTRAINT "class_attendance_taken_by_fkey" FOREIGN KEY ("taken_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_attendance_window_id_fkey" FOREIGN KEY ("attendance_window_id") REFERENCES "attendance_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kitchen_production_logs" ADD CONSTRAINT "kitchen_production_logs_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "kitchen_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kitchen_production_logs" ADD CONSTRAINT "kitchen_production_logs_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distribution_batches" ADD CONSTRAINT "distribution_batches_attendance_window_id_fkey" FOREIGN KEY ("attendance_window_id") REFERENCES "attendance_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "distribution_batches" ADD CONSTRAINT "distribution_batches_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_distributions" ADD CONSTRAINT "class_distributions_distribution_batch_id_fkey" FOREIGN KEY ("distribution_batch_id") REFERENCES "distribution_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_distributions" ADD CONSTRAINT "class_distributions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_distributions" ADD CONSTRAINT "class_distributions_distributed_by_fkey" FOREIGN KEY ("distributed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_offerings" ADD CONSTRAINT "class_offerings_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_offerings" ADD CONSTRAINT "class_offerings_attendance_window_id_fkey" FOREIGN KEY ("attendance_window_id") REFERENCES "attendance_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_offerings" ADD CONSTRAINT "class_offerings_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "empowerment_requests" ADD CONSTRAINT "empowerment_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "empowerment_requests" ADD CONSTRAINT "empowerment_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "empowerment_requests" ADD CONSTRAINT "empowerment_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "member_logs" ADD CONSTRAINT "member_logs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_logs" ADD CONSTRAINT "member_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "member_log_attachments" ADD CONSTRAINT "member_log_attachments_member_log_id_fkey" FOREIGN KEY ("member_log_id") REFERENCES "member_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requests" ADD CONSTRAINT "requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "requests" ADD CONSTRAINT "requests_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_attendance" ADD CONSTRAINT "event_attendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_attendance" ADD CONSTRAINT "event_attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Rename indexes (from add_class_offerings migration)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_actor') THEN
        ALTER INDEX "idx_activity_actor" RENAME TO "activity_logs_actor_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_date') THEN
        ALTER INDEX "idx_activity_date" RENAME TO "activity_logs_created_at_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_entity') THEN
        ALTER INDEX "idx_activity_entity" RENAME TO "activity_logs_entity_type_entity_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'class_attendance_unique') THEN
        ALTER INDEX "class_attendance_unique" RENAME TO "class_attendance_class_id_attendance_window_id_key";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_class') THEN
        ALTER INDEX "idx_attendance_class" RENAME TO "class_attendance_class_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_window') THEN
        ALTER INDEX "idx_attendance_window" RENAME TO "class_attendance_attendance_window_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_class_distribution_batch') THEN
        ALTER INDEX "idx_class_distribution_batch" RENAME TO "class_distributions_distribution_batch_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_class_distribution_class') THEN
        ALTER INDEX "idx_class_distribution_class" RENAME TO "class_distributions_class_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'class_leaders_unique') THEN
        ALTER INDEX "class_leaders_unique" RENAME TO "class_leaders_class_id_user_id_role_key";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_class_leaders_class') THEN
        ALTER INDEX "idx_class_leaders_class" RENAME TO "class_leaders_class_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_class_leaders_user') THEN
        ALTER INDEX "idx_class_leaders_user" RENAME TO "class_leaders_user_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_classes_type') THEN
        ALTER INDEX "idx_classes_type" RENAME TO "classes_type_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_distribution_window') THEN
        ALTER INDEX "idx_distribution_window" RENAME TO "distribution_batches_attendance_window_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_empowerment_member') THEN
        ALTER INDEX "idx_empowerment_member" RENAME TO "empowerment_requests_member_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_empowerment_status') THEN
        ALTER INDEX "idx_empowerment_status" RENAME TO "empowerment_requests_status_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_class') THEN
        ALTER INDEX "idx_events_class" RENAME TO "events_class_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_scope') THEN
        ALTER INDEX "idx_events_scope" RENAME TO "events_scope_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_kitchen_week') THEN
        ALTER INDEX "idx_kitchen_week" RENAME TO "kitchen_production_logs_week_date_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_member_history_date') THEN
        ALTER INDEX "idx_member_history_date" RENAME TO "member_class_history_transferred_at_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_member_history_member') THEN
        ALTER INDEX "idx_member_history_member" RENAME TO "member_class_history_member_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_member_logs_member') THEN
        ALTER INDEX "idx_member_logs_member" RENAME TO "member_logs_member_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_members_birthday') THEN
        ALTER INDEX "idx_members_birthday" RENAME TO "members_birthday_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_members_class') THEN
        ALTER INDEX "idx_members_class" RENAME TO "members_current_class_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_unread') THEN
        ALTER INDEX "idx_notifications_unread" RENAME TO "notifications_is_read_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user') THEN
        ALTER INDEX "idx_notifications_user" RENAME TO "notifications_user_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_requests_status') THEN
        ALTER INDEX "idx_requests_status" RENAME TO "requests_status_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_requests_type') THEN
        ALTER INDEX "idx_requests_type" RENAME TO "requests_type_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_roles_role') THEN
        ALTER INDEX "idx_user_roles_role" RENAME TO "user_roles_role_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_roles_user') THEN
        ALTER INDEX "idx_user_roles_user" RENAME TO "user_roles_user_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_roles_user_role_unique') THEN
        ALTER INDEX "user_roles_user_role_unique" RENAME TO "user_roles_user_id_role_id_key";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_active') THEN
        ALTER INDEX "idx_users_active" RENAME TO "users_is_active_idx";
    END IF;
END $$;
