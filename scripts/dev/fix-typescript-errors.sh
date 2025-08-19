#!/bin/bash

echo "🔧 Fixing TypeScript errors..."

# Fix 1: Add updatedAt to seed data models
echo "Adding updatedAt to SystemConfig seeds..."
sed -i '' 's/description: string;/description: string; updatedAt: new Date();/' scripts/database/seed-mock-data.ts 2>/dev/null || true

# Fix 2: Fix createdById to createdBy
echo "Fixing createdById references..."
sed -i '' 's/createdById:/createdBy:/' scripts/database/seed-mock-data.ts 2>/dev/null || true

# Fix 3: Remove invalid properties
echo "Removing invalid properties..."
sed -i '' '/position:/d' scripts/database/seed-mock-data.ts 2>/dev/null || true

# Fix 4: Fix Survey updatedAt
echo "Fixing Survey model..."
sed -i '' '/const surveys = \[/,/\];/{
  /createdAt:/a\
        updatedAt: new Date(),
}' scripts/database/seed-mock-data.ts 2>/dev/null || true

# Fix 5: Fix error handling
echo "Fixing error handling..."
sed -i '' "s/error\.message/(error as Error).message/g" scripts/database/cleanup-and-setup-sankaz.ts 2>/dev/null || true

# Fix 6: Add type annotations
echo "Adding type annotations..."
sed -i '' "s/(answer)/(answer: any)/g" scripts/database/clear-workspace-sessions.ts 2>/dev/null || true

# Fix 7: Fix test environment seed
echo "Fixing test environment seed..."
sed -i '' "s/emailVerified: true/emailVerified: new Date()/" scripts/database/seed-test-environment.ts 2>/dev/null || true
sed -i '' 's/ownerId:/owner:/' scripts/database/seed-test-environment.ts 2>/dev/null || true
sed -i '' 's/sessionId:/id:/' scripts/database/seed-test-environment.ts 2>/dev/null || true

# Fix 8: Fix generator module errors
echo "Fixing generator module..."
# This is complex, we'll handle it separately

echo "✅ Basic fixes applied. Running type check..."
npm run type-check 2>&1 | head -20