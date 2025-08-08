#!/bin/bash

# CMS Database Reset Script
echo "🗄️  Database Reset Script"
echo "======================="
echo ""
echo "⚠️  WARNING: This will delete all data in the database!"
echo ""

# Confirm action
read -p "Are you sure you want to reset the database? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "❌ Database reset cancelled"
    exit 0
fi

echo ""
echo "🔄 Resetting database..."

# Reset database
npx prisma db push --force-reset

echo ""
echo "✅ Database reset complete!"

# Ask about seeding
read -p "Do you want to seed the database with sample data? (y/N): " seed_db
if [[ $seed_db =~ ^[Yy]$ ]]; then
    echo ""
    echo "🌱 Seeding database..."
    npx prisma db seed
    echo "✅ Database seeded!"
fi

echo ""
echo "Database is ready to use!"