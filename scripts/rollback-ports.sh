#!/bin/bash
# Rollback port migration
echo "🔙 Rolling back port migration..."
echo "Backup directory: /Volumes/Untitled/Progress/port/backup/port-migration-2025-08-19T06-39-39-613Z"

if [ ! -d "/Volumes/Untitled/Progress/port/backup/port-migration-2025-08-19T06-39-39-613Z" ]; then
  echo "❌ Backup directory not found!"
  exit 1
fi

# Copy files back
rsync -av "/Volumes/Untitled/Progress/port/backup/port-migration-2025-08-19T06-39-39-613Z/" ./
echo "✅ Rollback complete!"

# Clean up backup
read -p "Delete backup directory? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm -rf "/Volumes/Untitled/Progress/port/backup/port-migration-2025-08-19T06-39-39-613Z"
  echo "🗑️  Backup directory deleted"
fi
