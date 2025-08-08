#!/bin/bash

echo "🚀 Setting up CMS development environment..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

echo "✅ PostgreSQL is running"

# Check if database exists
if ! psql -h localhost -p 5432 -U postgres -lqt | cut -d \| -f 1 | grep -qw cms_db; then
    echo "📦 Creating database..."
    createdb -h localhost -p 5432 -U postgres cms_db
    echo "✅ Database created"
else
    echo "✅ Database already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "🗄️ Pushing database schema..."
npx prisma db push

# Seed database
echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Development environment setup complete!"
echo ""
echo "📝 Default admin credentials:"
echo "   Email: admin@example.com"
echo "   Password: Admin@123"
echo ""
echo "🚀 Run 'npm run dev' to start the development server"