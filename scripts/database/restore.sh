#!/bin/bash

# CMS Restore Script
echo "♻️  CMS Restore Script"
echo "===================="
echo ""

# Check if backup file provided
if [ -z "$1" ]; then
    echo "❌ Please provide backup file path"
    echo "Usage: ./scripts/restore.sh backups/backup_file.tar.gz"
    exit 1
fi

BACKUP_FILE=$1

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will overwrite current data!"
read -p "Are you sure you want to restore from backup? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 0
fi

# Create temp directory for extraction
TEMP_DIR="temp_restore_$(date +%Y%m%d_%H%M%S)"
mkdir -p $TEMP_DIR

echo ""
echo "📦 Extracting backup..."
tar -xzf "$BACKUP_FILE" -C $TEMP_DIR

# Find the extracted directory
BACKUP_DIR=$(ls $TEMP_DIR)

# Get database connection details
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "⚠️  .env.local not found, using backup version..."
    cp "$TEMP_DIR/$BACKUP_DIR/.env.local" .env.local
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Parse DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Restore database
echo "📊 Restoring database..."
echo "   Dropping existing database..."
PGPASSWORD=$DB_PASS dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null
echo "   Creating new database..."
PGPASSWORD=$DB_PASS createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
echo "   Restoring data..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < "$TEMP_DIR/$BACKUP_DIR/database.sql"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully"
else
    echo "❌ Database restore failed"
    exit 1
fi

# Restore uploads if exists
if [ -d "$TEMP_DIR/$BACKUP_DIR/uploads" ]; then
    echo "📁 Restoring uploads..."
    rm -rf public/uploads
    cp -r "$TEMP_DIR/$BACKUP_DIR/uploads" public/
    echo "✅ Uploads restored"
fi

# Clean up
echo "🧹 Cleaning up..."
rm -rf $TEMP_DIR

echo ""
echo "✅ Restore completed successfully!"
echo ""
echo "Please restart the application:"
echo "  npm run dev"