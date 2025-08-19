-- ============================================================================
-- Database Table Rename Rollback Script
-- Purpose: Rollback snake_case tables to PascalCase if migration fails
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
-- STEP 1: Log Rollback Start
-- ============================================================================

INSERT INTO "AuditLog" (id, action, resource, metadata, severity, "createdAt")
VALUES (
    gen_random_uuid()::text,
    'TABLE_RENAME_ROLLBACK_START',
    'DATABASE_SCHEMA',
    jsonb_build_object(
        'rollback_type', 'snake_case_to_pascal',
        'reason', 'Manual rollback requested',
        'timestamp', NOW()
    ),
    'warning',
    NOW()
);

-- ============================================================================
-- STEP 2: Disable Foreign Key Constraints
-- ============================================================================

SET session_replication_role = 'replica';

-- ============================================================================
-- STEP 3: Rollback Table Names
-- ============================================================================

-- 3.1: Rollback users to User
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public') THEN
        -- Rename the table back
        ALTER TABLE users RENAME TO "User";
        
        -- Rename sequences if they exist
        IF EXISTS (SELECT FROM pg_sequences WHERE sequencename = 'users_id_seq') THEN
            ALTER SEQUENCE users_id_seq RENAME TO "User_id_seq";
        END IF;
        
        -- Rename primary key constraint
        ALTER TABLE "User" RENAME CONSTRAINT users_pkey TO "User_pkey";
        
        RAISE NOTICE 'Rolled back users to User';
    END IF;
END $$;

-- 3.2: Rollback chat_folders to AssistantFolder
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_folders' AND schemaname = 'public') THEN
        ALTER TABLE chat_folders RENAME TO "AssistantFolder";
        
        -- Rename constraints
        ALTER TABLE "AssistantFolder" RENAME CONSTRAINT chat_folders_pkey TO "AssistantFolder_pkey";
        
        -- Update unique constraints if they exist
        IF EXISTS (
            SELECT FROM pg_constraint 
            WHERE conname = 'chat_folders_userId_name_key' 
            AND conrelid = '"AssistantFolder"'::regclass
        ) THEN
            ALTER TABLE "AssistantFolder" RENAME CONSTRAINT chat_folders_userId_name_key TO "AssistantFolder_userId_name_key";
        END IF;
        
        RAISE NOTICE 'Rolled back chat_folders to AssistantFolder';
    END IF;
END $$;

-- 3.3: Rollback chat_sessions to AssistantChatSession
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_sessions' AND schemaname = 'public') THEN
        ALTER TABLE chat_sessions RENAME TO "AssistantChatSession";
        ALTER TABLE "AssistantChatSession" RENAME CONSTRAINT chat_sessions_pkey TO "AssistantChatSession_pkey";
        
        RAISE NOTICE 'Rolled back chat_sessions to AssistantChatSession';
    END IF;
END $$;

-- 3.4: Rollback chat_sessions_temp to AssistantConversation (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_sessions_temp' AND schemaname = 'public') THEN
        ALTER TABLE chat_sessions_temp RENAME TO "AssistantConversation";
        ALTER TABLE "AssistantConversation" RENAME CONSTRAINT chat_sessions_temp_pkey TO "AssistantConversation_pkey";
        
        RAISE NOTICE 'Rolled back chat_sessions_temp to AssistantConversation';
    END IF;
END $$;

-- 3.5: Rollback chat_messages to AssistantChatMessage
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_messages' AND schemaname = 'public') THEN
        ALTER TABLE chat_messages RENAME TO "AssistantChatMessage";
        ALTER TABLE "AssistantChatMessage" RENAME CONSTRAINT chat_messages_pkey TO "AssistantChatMessage_pkey";
        
        RAISE NOTICE 'Rolled back chat_messages to AssistantChatMessage';
    END IF;
END $$;

-- 3.6: Rollback chat_messages_temp to AssistantMessage (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_messages_temp' AND schemaname = 'public') THEN
        ALTER TABLE chat_messages_temp RENAME TO "AssistantMessage";
        ALTER TABLE "AssistantMessage" RENAME CONSTRAINT chat_messages_temp_pkey TO "AssistantMessage_pkey";
        
        RAISE NOTICE 'Rolled back chat_messages_temp to AssistantMessage';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Rollback Index Names
-- ============================================================================

DO $$
DECLARE
    idx record;
BEGIN
    -- Rollback User table indexes
    FOR idx IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'User' 
        AND indexname LIKE 'users_%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx.indexname, 
            replace(idx.indexname, 'users_', 'User_')
        );
    END LOOP;
    
    -- Rollback AssistantFolder indexes
    FOR idx IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'AssistantFolder' 
        AND indexname LIKE 'chat_folders_%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx.indexname, 
            replace(idx.indexname, 'chat_folders_', 'AssistantFolder_')
        );
    END LOOP;
    
    -- Rollback AssistantChatSession indexes
    FOR idx IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'AssistantChatSession' 
        AND indexname LIKE 'chat_sessions_%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx.indexname, 
            replace(idx.indexname, 'chat_sessions_', 'AssistantChatSession_')
        );
    END LOOP;
    
    -- Rollback AssistantChatMessage indexes
    FOR idx IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'AssistantChatMessage' 
        AND indexname LIKE 'chat_messages_%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx.indexname, 
            replace(idx.indexname, 'chat_messages_', 'AssistantChatMessage_')
        );
    END LOOP;
END $$;

-- ============================================================================
-- STEP 5: Remove Added Columns (if any)
-- ============================================================================

-- Remove columns that were added during migration
DO $$
BEGIN
    -- Remove added columns from User table if they were added by migration
    -- (Only if they weren't there originally - this needs manual verification)
    
    -- Note: Be careful here - only remove columns that were specifically 
    -- added by the migration script and weren't part of original schema
    
    RAISE NOTICE 'Column removal skipped - requires manual verification';
END $$;

-- ============================================================================
-- STEP 6: Re-enable Foreign Key Constraints
-- ============================================================================

SET session_replication_role = 'origin';

-- ============================================================================
-- STEP 7: Verification
-- ============================================================================

DO $$
DECLARE
    rollback_count integer;
    expected_tables text[] := ARRAY['User', 'AssistantFolder', 'AssistantChatSession', 'AssistantChatMessage'];
    restored_tables text[];
    missing_tables text[];
    i text;
BEGIN
    -- Count restored tables
    SELECT COUNT(*) INTO rollback_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = ANY(expected_tables);
    
    -- Find missing tables
    missing_tables := ARRAY[]::text[];
    restored_tables := ARRAY[]::text[];
    
    FOREACH i IN ARRAY expected_tables
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE tablename = i AND schemaname = 'public') THEN
            restored_tables := array_append(restored_tables, i);
        ELSE
            missing_tables := array_append(missing_tables, i);
        END IF;
    END LOOP;
    
    -- Report results
    RAISE NOTICE 'Rollback completed. Restored % tables', rollback_count;
    RAISE NOTICE 'Restored tables: %', array_to_string(restored_tables, ', ');
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING 'Tables not found for rollback: %', array_to_string(missing_tables, ', ');
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Log Rollback Completion
-- ============================================================================

INSERT INTO "AuditLog" (id, action, resource, metadata, severity, "createdAt")
VALUES (
    gen_random_uuid()::text,
    'TABLE_RENAME_ROLLBACK_COMPLETE',
    'DATABASE_SCHEMA',
    jsonb_build_object(
        'rollback_type', 'snake_case_to_pascal',
        'timestamp', NOW(),
        'tables_restored', ARRAY['users->User', 'chat_folders->AssistantFolder', 
                                 'chat_sessions->AssistantChatSession', 
                                 'chat_messages->AssistantChatMessage']
    ),
    'warning',
    NOW()
);

-- Commit the rollback
COMMIT;

-- ============================================================================
-- POST-ROLLBACK NOTES
-- ============================================================================
-- After running this rollback script:
-- 1. Revert Prisma schema files to use PascalCase table names
-- 2. Run: npx prisma generate
-- 3. Test the application with original table names
-- 4. Investigate why the migration failed
-- 5. Create a backup of the current database state