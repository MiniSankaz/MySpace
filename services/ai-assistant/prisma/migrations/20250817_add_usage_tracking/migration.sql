-- CreateTable for usage tracking (Fair Use Policy compliance)
CREATE TABLE IF NOT EXISTS "usage_tracking" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" VARCHAR(255) NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB
);

-- Create indexes for efficient querying
CREATE INDEX "usage_tracking_user_id_idx" ON "usage_tracking"("user_id");
CREATE INDEX "usage_tracking_timestamp_idx" ON "usage_tracking"("timestamp");
CREATE INDEX "usage_tracking_session_id_idx" ON "usage_tracking"("session_id");
CREATE INDEX "usage_tracking_user_timestamp_idx" ON "usage_tracking"("user_id", "timestamp" DESC);

-- Create table for user context storage (ephemeral sessions)
CREATE TABLE IF NOT EXISTS "user_context" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" VARCHAR(255) NOT NULL UNIQUE,
    "context_summary" TEXT,
    "recent_messages" JSONB,
    "system_prompt" TEXT,
    "total_interactions" INTEGER DEFAULT 0,
    "last_interaction" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user context
CREATE INDEX "user_context_user_id_idx" ON "user_context"("user_id");
CREATE INDEX "user_context_updated_at_idx" ON "user_context"("updated_at" DESC);

-- Create table for rate limit tracking
CREATE TABLE IF NOT EXISTS "rate_limits" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" VARCHAR(255) NOT NULL,
    "limit_type" VARCHAR(50) NOT NULL, -- 'minute', 'hour', 'day'
    "count" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("user_id", "limit_type")
);

-- Create indexes for rate limits
CREATE INDEX "rate_limits_user_id_idx" ON "rate_limits"("user_id");
CREATE INDEX "rate_limits_reset_at_idx" ON "rate_limits"("reset_at");

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_context_updated_at BEFORE UPDATE ON "user_context"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON "rate_limits"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();