#!/bin/bash

# Pre-commit hook for SOP compliance check
# Prevents commits with hardcoded values

echo "🔍 Running SOP compliance check..."

# Run the validator
node scripts/sop-compliance-validator.js > /tmp/sop-check.log 2>&1
EXIT_CODE=$?

# Show the output
cat /tmp/sop-check.log

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ SOP compliance check FAILED!"
  echo "Hardcoded values detected. Please fix before committing."
  echo ""
  echo "To auto-fix violations, run:"
  echo "  npm run sop:fix"
  echo ""
  echo "To bypass this check (NOT RECOMMENDED), use:"
  echo "  git commit --no-verify"
  echo ""
  exit 1
fi

echo "✅ SOP compliance check passed!"
exit 0