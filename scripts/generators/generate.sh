#!/bin/bash

# Smart Code Generator CLI Wrapper
# Usage: ./scripts/generate.sh [type] [name] [options]

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Smart Code Generator${NC}"
echo ""

# Check if arguments provided
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./scripts/generate.sh [type] [name] [options]"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./scripts/generate.sh api products"
    echo "  ./scripts/generate.sh admin-page users --auth --pagination"
    echo "  ./scripts/generate.sh full-crud orders --component"
    echo "  ./scripts/generate.sh component UserCard --client"
    echo "  ./scripts/generate.sh analyze"
    echo ""
    echo -e "${YELLOW}Available types:${NC}"
    echo "  api          - Generate API route with CRUD operations"
    echo "  component    - Generate React component"
    echo "  admin-page   - Generate admin panel page"
    echo "  model        - Generate Prisma model"
    echo "  full-crud    - Generate complete CRUD (API + Page + Component)"
    echo "  analyze      - Analyze existing project patterns"
    echo ""
    echo -e "${YELLOW}Common options:${NC}"
    echo "  --auth       - Include authentication"
    echo "  --pagination - Include pagination"
    echo "  --search     - Include search functionality"
    echo "  --component  - Generate additional component"
    echo "  --client     - Make component client-side"
    exit 0
fi

# Run the TypeScript generator
npx tsx scripts/code-generator.ts "$@"

# Check if generation was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Code generation completed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Review the generated code"
    echo "2. Update imports if needed"
    echo "3. Add to navigation/routing if applicable"
    echo "4. Test the functionality"
    echo "5. Use AI for refinement if needed:"
    echo -e "   ${BLUE}./u \"refine the generated [type] for [name]\"${NC}"
else
    echo ""
    echo -e "${RED}❌ Code generation failed!${NC}"
    exit 1
fi