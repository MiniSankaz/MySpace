-- CreateTable for AI Usage Metrics
CREATE TABLE IF NOT EXISTS "ai_usage_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" VARCHAR(255) NOT NULL,
    "agent_type" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER NOT NULL,
    "cost" DECIMAL(10,4) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "task_id" VARCHAR(255),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable for AI Usage Alerts
CREATE TABLE IF NOT EXISTS "ai_usage_alerts" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "threshold" INTEGER NOT NULL,
    "current_usage" DECIMAL(10,2) NOT NULL,
    "limit_value" DECIMAL(10,2) NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_at" TIMESTAMPTZ,
    "acknowledged_by" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable for Hourly Aggregates
CREATE TABLE IF NOT EXISTS "ai_usage_hourly_aggregates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(255) NOT NULL,
    "hour" TIMESTAMPTZ NOT NULL,
    "total_tokens" BIGINT NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "model_breakdown" JSONB NOT NULL DEFAULT '{}',
    "agent_breakdown" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_hourly_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable for Daily Aggregates
CREATE TABLE IF NOT EXISTS "ai_usage_daily_aggregates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(255) NOT NULL,
    "date" DATE NOT NULL,
    "total_tokens" BIGINT NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "opus_hours" DECIMAL(10,2) DEFAULT 0,
    "sonnet_hours" DECIMAL(10,2) DEFAULT 0,
    "haiku_hours" DECIMAL(10,2) DEFAULT 0,
    "model_breakdown" JSONB NOT NULL DEFAULT '{}',
    "agent_breakdown" JSONB NOT NULL DEFAULT '{}',
    "alert_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_daily_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for ai_usage_metrics
CREATE INDEX IF NOT EXISTS "idx_user_created" ON "ai_usage_metrics"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_agent_created" ON "ai_usage_metrics"("agent_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_model_created" ON "ai_usage_metrics"("model", "created_at");

-- CreateIndex for ai_usage_alerts
CREATE INDEX IF NOT EXISTS "idx_user_alerts" ON "ai_usage_alerts"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_unack_alerts" ON "ai_usage_alerts"("acknowledged", "level");

-- CreateIndex for ai_usage_hourly_aggregates
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_hour_unique" ON "ai_usage_hourly_aggregates"("user_id", "hour");

-- CreateIndex for ai_usage_daily_aggregates
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_date_unique" ON "ai_usage_daily_aggregates"("user_id", "date");

-- Add comment for documentation
COMMENT ON TABLE "ai_usage_metrics" IS 'Tracks detailed usage metrics for AI agents and Claude API calls';
COMMENT ON TABLE "ai_usage_alerts" IS 'Stores usage alerts and threshold notifications';
COMMENT ON TABLE "ai_usage_hourly_aggregates" IS 'Pre-aggregated hourly usage data for performance';
COMMENT ON TABLE "ai_usage_daily_aggregates" IS 'Pre-aggregated daily usage data for reporting';