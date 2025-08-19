#!/bin/bash

# Start Market Data Service

echo "Starting Market Data Service on port 4170..."

# Set environment variables
export PORT=4170
export NODE_ENV=development
export DATABASE_URL="postgresql://personalai_user:Sankaz25167B@db-postgresql-sgp1-43887-do-user-24411302-0.m.db.ondigitalocean.com:25060/personalAI?schema=public&sslmode=require"
export REDIS_HOST=localhost
export REDIS_PORT=6379

# Check if Polygon API key is set
if [ -z "$POLYGON_API_KEY" ]; then
    echo "Warning: POLYGON_API_KEY not set, using mock service"
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Start the service
echo "Starting service..."
npm start