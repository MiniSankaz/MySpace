#!/bin/bash

# Code Marking Service Startup Script

echo "🚀 Starting Code Marking Service..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp .env.example .env
    echo "📝 Please configure .env file with your settings"
    exit 1
fi

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check database connection
echo "🗄️  Checking database connection..."
npx prisma db push --skip-generate 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Database connection failed. Please check DATABASE_URL in .env"
    exit 1
fi

# Apply migrations
echo "📊 Applying database migrations..."
npx prisma migrate deploy

# Check if AI Orchestrator is running
echo "🤖 Checking AI Orchestrator..."
curl -s http://localhost:4191/health > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  AI Orchestrator not running on port 4191"
    echo "   Start it with: cd ../ai-assistant && ORCHESTRATION_PORT=4191 npm run dev"
fi

# Start the service
echo "✨ Starting Code Marking Service on port ${PORT:-4192}..."
npm run dev