#!/bin/bash

# Source port configuration
source "$(dirname "$0")/../shared/config/ports.sh"

# Quick Setup for Local Use
echo "🚀 Quick Setup - Personal Assistant"
echo "===================================="
echo ""

# Use SQLite for simplicity
echo "📦 Setting up with SQLite (no database server needed)..."

# Copy SQLite config
cp .env.local.sqlite .env.local

# Generate secure secrets
echo "🔐 Generating secure secrets..."
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "local-jwt-secret-$(date +%s)")
NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "local-nextauth-secret-$(date +%s)")

# Update .env.local with generated secrets
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/local-jwt-secret-change-this/$JWT_SECRET/g" .env.local
    sed -i '' "s/local-nextauth-secret-change-this/$NEXTAUTH_SECRET/g" .env.local
else
    # Linux
    sed -i "s/local-jwt-secret-change-this/$JWT_SECRET/g" .env.local
    sed -i "s/local-nextauth-secret-change-this/$NEXTAUTH_SECRET/g" .env.local
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup database
echo "🗄️ Setting up database..."
npx prisma generate
npx prisma db push --skip-generate

# Build application
echo "🔨 Building application..."
npm run build

echo ""
echo "✅ Setup Complete!"
echo ""
echo "To start the application:"
echo "  npm start"
echo ""
echo "Then open: http://localhost:$PORT_GATEWAY_MAIN/assistant"
echo ""