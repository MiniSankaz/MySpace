#!/bin/bash

# CMS Backup Script
echo "💾 CMS Backup Script"
echo "==================="
echo ""

# Create backup directory
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Get database connection details from .env.local
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "❌ .env.local not found!"
    exit 1
fi

# Parse DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📊 Backing up database..."
PGPASSWORD=$DB_PASS pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/database.sql"

if [ $? -eq 0 ]; then
    echo "✅ Database backed up successfully"
else
    echo "❌ Database backup failed"
    exit 1
fi

# Backup uploads directory if exists
if [ -d "public/uploads" ]; then
    echo "📁 Backing up uploads..."
    cp -r public/uploads "$BACKUP_DIR/"
    echo "✅ Uploads backed up"
fi

# Backup .env.local
echo "⚙️  Backing up environment configuration..."
cp .env.local "$BACKUP_DIR/"
echo "✅ Environment backed up"

# Create backup info
echo "📝 Creating backup info..."
cat > "$BACKUP_DIR/backup-info.txt" << EOF
CMS Backup Information
======================
Date: $(date)
Database: $DB_NAME
Host: $DB_HOST
Files included:
- database.sql (PostgreSQL dump)
- .env.local (Environment configuration)
$([ -d "public/uploads" ] && echo "- uploads/ (User uploaded files)")

To restore this backup:
1. Create new database: createdb $DB_NAME
2. Restore database: psql $DB_NAME < database.sql
3. Copy .env.local to project root
4. Copy uploads/ to public/ (if applicable)
EOF

# Compress backup
echo "🗜️  Compressing backup..."
tar -czf "$BACKUP_DIR.tar.gz" -C backups "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

echo ""
echo "✅ Backup completed successfully!"
echo "📦 Backup file: $BACKUP_DIR.tar.gz"
echo ""
echo "To restore from this backup, run:"
echo "  ./scripts/restore.sh $BACKUP_DIR.tar.gz"