-- ============================================================================
-- Database Table Rename Migration Script
-- Purpose: Rename PascalCase tables to snake_case for AI Assistant compatibility
-- Target Database: personalAI on DigitalOcean PostgreSQL
-- Date: 2025-08-16
-- ============================================================================

-- Safety checks
DO $$
BEGIN
    -- Check if we're in the correct database
    IF current_database() != 'personalAI' THEN
        RAISE EXCEPTION 'Wrong database! Expected personalAI, got %', current_database();
    END IF;
END $$;

-- Start transaction for atomicity
BEGIN;

-- ============================================================================
-- STEP 1: Create backup points (metadata only, actual backup should be done externally)
-- ============================================================================

-- Log the migration start
INSERT INTO "AuditLog" (id, action, resource, metadata, severity, "createdAt")
VALUES (
    gen_random_uuid()::text,
    'TABLE_RENAME_MIGRATION_START',
    'DATABASE_SCHEMA',
    jsonb_build_object(
        'migration_type', 'pascal_to_snake_case',
        'target_service', 'ai-assistant',
        'timestamp', NOW()
    ),
    'info',
    NOW()
);

-- ============================================================================
-- STEP 2: Check if target tables already exist (safety check)
-- ============================================================================

DO $$
DECLARE
    table_exists boolean;
BEGIN
    -- Check if any target tables already exist
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'chat_folders', 'chat_sessions', 'chat_messages')
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE EXCEPTION 'Target snake_case tables already exist! Aborting migration.';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Disable Foreign Key Constraints Temporarily
-- ============================================================================

-- Store current constraint checking state and disable
SET session_replication_role = 'replica';

-- ============================================================================
-- STEP 4: Rename Core Tables
-- ============================================================================

-- 4.1: Rename User table (most referenced, rename first)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'User' AND schemaname = 'public') THEN
        -- Rename the table
        ALTER TABLE "User" RENAME TO users;
        
        -- Rename sequences if they exist
        IF EXISTS (SELECT FROM pg_sequences WHERE sequencename = 'User_id_seq') THEN
            ALTER SEQUENCE "User_id_seq" RENAME TO users_id_seq;
        END IF;
        
        -- Rename primary key constraint
        ALTER TABLE users RENAME CONSTRAINT "User_pkey" TO users_pkey;
        
        RAISE NOTICE 'Renamed User to users';
    END IF;
END $$;

-- 4.2: Rename AssistantFolder to chat_folders
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'AssistantFolder' AND schemaname = 'public') THEN
        ALTER TABLE "AssistantFolder" RENAME TO chat_folders;
        
        -- Rename constraints
        ALTER TABLE chat_folders RENAME CONSTRAINT "AssistantFolder_pkey" TO chat_folders_pkey;
        
        -- Update unique constraints if they exist
        IF EXISTS (
            SELECT FROM pg_constraint 
            WHERE conname = 'AssistantFolder_userId_name_key' 
            AND conrelid = 'chat_folders'::regclass
        ) THEN
            ALTER TABLE chat_folders RENAME CONSTRAINT "AssistantFolder_userId_name_key" TO chat_folders_userId_name_key;
        END IF;
        
        RAISE NOTICE 'Renamed AssistantFolder to chat_folders';
    END IF;
END $$;

-- 4.3: Rename AssistantConversation to chat_sessions (temporary, will be merged later)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'AssistantConversation' AND schemaname = 'public') THEN
        -- First rename to temporary name to avoid conflicts
        ALTER TABLE "AssistantConversation" RENAME TO chat_sessions_temp;
        ALTER TABLE chat_sessions_temp RENAME CONSTRAINT "AssistantConversation_pkey" TO chat_sessions_temp_pkey;
        
        RAISE NOTICE 'Renamed AssistantConversation to chat_sessions_temp';
    END IF;
END $$;

-- 4.4: Rename AssistantChatSession to chat_sessions (this is the main one we want)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'AssistantChatSession' AND schemaname = 'public') THEN
        ALTER TABLE "AssistantChatSession" RENAME TO chat_sessions;
        ALTER TABLE chat_sessions RENAME CONSTRAINT "AssistantChatSession_pkey" TO chat_sessions_pkey;
        
        RAISE NOTICE 'Renamed AssistantChatSession to chat_sessions';
    END IF;
END $$;

-- 4.5: Rename AssistantMessage to chat_messages_temp (temporary)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'AssistantMessage' AND schemaname = 'public') THEN
        ALTER TABLE "AssistantMessage" RENAME TO chat_messages_temp;
        ALTER TABLE chat_messages_temp RENAME CONSTRAINT "AssistantMessage_pkey" TO chat_messages_temp_pkey;
        
        RAISE NOTICE 'Renamed AssistantMessage to chat_messages_temp';
    END IF;
END $$;

-- 4.6: Rename AssistantChatMessage to chat_messages (this is the main one we want)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'AssistantChatMessage' AND schemaname = 'public') THEN
        ALTER TABLE "AssistantChatMessage" RENAME TO chat_messages;
        ALTER TABLE chat_messages RENAME CONSTRAINT "AssistantChatMessage_pkey" TO chat_messages_pkey;
        
        RAISE NOTICE 'Renamed AssistantChatMessage to chat_messages';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Update Foreign Key Constraints
-- ============================================================================

-- Update foreign key constraints to reference renamed tables
DO $$
DECLARE
    fk record;
BEGIN
    -- Find all foreign keys referencing the old User table
    FOR fk IN 
        SELECT 
            conname AS constraint_name,
            conrelid::regclass AS table_name,
            a.attname AS column_name
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE c.confrelid = 'users'::regclass
        AND c.contype = 'f'
    LOOP
        -- Constraints are automatically updated when table is renamed
        RAISE NOTICE 'Foreign key % on table % updated automatically', fk.constraint_name, fk.table_name;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 6: Update Indexes
-- ============================================================================

-- Rename indexes to follow new naming convention
DO $$
DECLARE
    idx record;
BEGIN
    -- Rename User table indexes
    FOR idx IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'users' 
        AND indexname LIKE 'User_%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx.indexname, 
            replace(idx.indexname, 'User_', 'users_')
        );
    END LOOP;
    
    -- Rename AssistantFolder indexes (now chat_folders)
    FOR idx IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'chat_folders' 
        AND indexname LIKE 'AssistantFolder_%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx.indexname, 
            replace(idx.indexname, 'AssistantFolder_', 'chat_folders_')
        );
    END LOOP;
    
    -- Rename AssistantChatSession indexes (now chat_sessions)
    FOR idx IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'chat_sessions' 
        AND indexname LIKE 'AssistantChatSession_%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx.indexname, 
            replace(idx.indexname, 'AssistantChatSession_', 'chat_sessions_')
        );
    END LOOP;
    
    -- Rename AssistantChatMessage indexes (now chat_messages)
    FOR idx IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'chat_messages' 
        AND indexname LIKE 'AssistantChatMessage_%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx.indexname, 
            replace(idx.indexname, 'AssistantChatMessage_', 'chat_messages_')
        );
    END LOOP;
END $$;

-- ============================================================================
-- STEP 7: Re-enable Foreign Key Constraints
-- ============================================================================

-- Re-enable constraint checking
SET session_replication_role = 'origin';

-- ============================================================================
-- STEP 8: Data Migration (if needed)
-- ============================================================================

-- Migrate data from temporary tables if they exist
DO $$
BEGIN
    -- If we have both chat_sessions_temp and chat_sessions, we might need to merge
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_sessions_temp' AND schemaname = 'public') 
       AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_sessions' AND schemaname = 'public') THEN
        -- Add migration logic here if needed
        RAISE NOTICE 'Both chat_sessions_temp and chat_sessions exist - manual review needed';
    END IF;
    
    -- Similar check for chat_messages
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_messages_temp' AND schemaname = 'public') 
       AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_messages' AND schemaname = 'public') THEN
        RAISE NOTICE 'Both chat_messages_temp and chat_messages exist - manual review needed';
    END IF;
END $$;

-- ============================================================================
-- STEP 9: Add Required Columns for AI Assistant Schema Compatibility
-- ============================================================================

-- Add missing columns to match AI Assistant Prisma schema
DO $$
BEGIN
    -- Add columns to users table if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER';
    END IF;
    
    -- Add columns to chat_folders if needed
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_folders') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'chat_folders' AND column_name = 'color') THEN
            ALTER TABLE chat_folders ADD COLUMN color TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'chat_folders' AND column_name = 'isDefault') THEN
            ALTER TABLE chat_folders ADD COLUMN "isDefault" BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'chat_folders' AND column_name = 'sessionCount') THEN
            ALTER TABLE chat_folders ADD COLUMN "sessionCount" INTEGER DEFAULT 0;
        END IF;
    END IF;
    
    -- Ensure chat_sessions has required columns
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'chat_sessions' AND column_name = 'title') THEN
            ALTER TABLE chat_sessions ADD COLUMN title TEXT DEFAULT 'Untitled Session';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'chat_sessions' AND column_name = 'isActive') THEN
            ALTER TABLE chat_sessions ADD COLUMN "isActive" BOOLEAN DEFAULT true;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'chat_sessions' AND column_name = 'folderId') THEN
            ALTER TABLE chat_sessions ADD COLUMN "folderId" TEXT;
        END IF;
    END IF;
    
    -- Ensure chat_messages has required columns
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_messages') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'chat_messages' AND column_name = 'role') THEN
            ALTER TABLE chat_messages ADD COLUMN role TEXT;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 10: Verification
-- ============================================================================

-- Verify the migration
DO $$
DECLARE
    renamed_count integer;
    expected_tables text[] := ARRAY['users', 'chat_folders', 'chat_sessions', 'chat_messages'];
    missing_tables text[];
    i text;
BEGIN
    -- Count renamed tables
    SELECT COUNT(*) INTO renamed_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = ANY(expected_tables);
    
    -- Find missing tables
    missing_tables := ARRAY[]::text[];
    FOREACH i IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = i AND schemaname = 'public') THEN
            missing_tables := array_append(missing_tables, i);
        END IF;
    END LOOP;
    
    -- Report results
    RAISE NOTICE 'Migration completed. Renamed % tables', renamed_count;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING 'Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
END $$;

-- ============================================================================
-- STEP 11: Log Migration Completion
-- ============================================================================

INSERT INTO "AuditLog" (id, action, resource, metadata, severity, "createdAt")
VALUES (
    gen_random_uuid()::text,
    'TABLE_RENAME_MIGRATION_COMPLETE',
    'DATABASE_SCHEMA',
    jsonb_build_object(
        'migration_type', 'pascal_to_snake_case',
        'target_service', 'ai-assistant',
        'timestamp', NOW(),
        'tables_renamed', ARRAY['User->users', 'AssistantFolder->chat_folders', 
                                'AssistantChatSession->chat_sessions', 
                                'AssistantChatMessage->chat_messages']
    ),
    'info',
    NOW()
);

-- Commit the transaction
COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================
-- After running this script:
-- 1. Update all Prisma schema files to use the new table names
-- 2. Run: npx prisma generate
-- 3. Test the AI Assistant service
-- 4. Update any raw SQL queries in the codebase
-- 5. Create a backup of the migrated database