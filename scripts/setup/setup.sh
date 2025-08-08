#!/bin/bash

# CMS Initial Setup Script
echo "🎯 CMS Initial Setup"
echo "===================="
echo ""

# Check Node.js version
echo "🔍 Checking Node.js version..."
node_version=$(node -v)
echo "Node.js version: $node_version"
echo ""

# Check PostgreSQL
echo "🔍 Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL is installed"
    psql --version
else
    echo "❌ PostgreSQL is not installed"
    echo "Please install PostgreSQL first: https://www.postgresql.org/download/"
    exit 1
fi
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# Setup environment file
if [ ! -f ".env.local" ]; then
    echo "⚙️  Setting up environment variables..."
    cp .env.example .env.local
    
    # Prompt for database URL
    echo ""
    echo "Please enter your PostgreSQL connection details:"
    read -p "Database URL (default: postgresql://postgres:password@localhost:5432/cms_db): " db_url
    db_url=${db_url:-postgresql://postgres:password@localhost:5432/cms_db}
    
    # Update .env.local
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|" .env.local
    else
        # Linux
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|" .env.local
    fi
    
    echo "✅ Environment configured"
else
    echo "✅ .env.local already exists"
fi
echo ""

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate
echo ""

# Create database and push schema
echo "📊 Setting up database..."
npx prisma db push
echo ""

# Seed database (optional)
read -p "Do you want to seed the database with sample data? (y/N): " seed_db
if [[ $seed_db =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    npx prisma db seed
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application, run:"
echo "  npm run dev"
echo ""
echo "Or use the start script:"
echo "  ./scripts/start.sh"
echo ""
echo "Access the application at:"
echo "  Frontend: http://localhost:3100"
echo "  Admin: http://localhost:3100/admin"