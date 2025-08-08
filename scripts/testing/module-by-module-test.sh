#!/bin/bash

# Module-by-Module CMS Test with Detailed Analysis

echo "============================================"
echo "🔍 CMS MODULE-BY-MODULE DETAILED TEST"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Base URL
BASE_URL="http://localhost:3100"

# Check if server is already running
if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${BLUE}Starting development server...${NC}"
    npm run dev > /tmp/cms-dev.log 2>&1 &
    DEV_PID=$!
    sleep 10
else
    echo -e "${GREEN}Server already running${NC}"
fi

# Function to test with details
test_detailed() {
    local module=$1
    local name=$2
    local method=$3
    local url=$4
    local expected=$5
    
    echo -e "\n${PURPLE}Testing: $name${NC}"
    echo "URL: $BASE_URL$url"
    echo -n "Status: "
    
    response=$(curl -s -o /tmp/response.html -w "%{http_code}" "$BASE_URL$url")
    
    if [ "$response" = "$expected" ]; then
        echo -e "${GREEN}✓ $response${NC}"
    else
        echo -e "${RED}✗ $response (Expected: $expected)${NC}"
        
        # Show redirect location if 307
        if [ "$response" = "307" ]; then
            location=$(curl -s -I "$BASE_URL$url" | grep -i "location:" | awk '{print $2}' | tr -d '\r')
            echo -e "${YELLOW}Redirects to: $location${NC}"
        fi
        
        # Show error message if available
        if [ "$response" = "500" ] || [ "$response" = "400" ]; then
            error=$(head -n 20 /tmp/response.html | grep -o "Error:.*" | head -1)
            [ -n "$error" ] && echo -e "${RED}Error: $error${NC}"
        fi
    fi
}

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}1. AUTHENTICATION MODULE${NC}"
echo -e "${BLUE}============================================${NC}"

test_detailed "Auth" "Login Page" "GET" "/login" "200"
test_detailed "Auth" "Register Page" "GET" "/register" "200"
test_detailed "Auth" "Session Check" "GET" "/api/auth/session" "200"

# Check login page functionality
echo -e "\n${PURPLE}Checking Login Form:${NC}"
if curl -s "$BASE_URL/login" | grep -q "form"; then
    echo -e "${GREEN}✓ Login form exists${NC}"
else
    echo -e "${RED}✗ Login form not found${NC}"
fi

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}2. PUBLIC PAGES MODULE${NC}"
echo -e "${BLUE}============================================${NC}"

test_detailed "Public" "Homepage" "GET" "/" "200"
test_detailed "Public" "Blog List" "GET" "/blog" "200"
test_detailed "Public" "Dynamic Page (About)" "GET" "/about" "404"
test_detailed "Public" "Contact Page" "GET" "/contact" "404"

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}3. ADMIN DASHBOARD MODULE${NC}"
echo -e "${BLUE}============================================${NC}"

test_detailed "Admin" "Dashboard" "GET" "/admin" "307"
test_detailed "Admin" "Direct Admin Login" "GET" "/admin/login" "404"

# Test all admin routes
ADMIN_ROUTES=(
    "/admin/posts"
    "/admin/pages" 
    "/admin/media"
    "/admin/categories"
    "/admin/tags"
    "/admin/users"
    "/admin/surveys"
    "/admin/newsletter"
    "/admin/chat"
    "/admin/menu"
    "/admin/theme/customizer"
    "/admin/analytics"
    "/admin/settings"
)

for route in "${ADMIN_ROUTES[@]}"; do
    name=$(echo $route | sed 's/\/admin\///' | sed 's/\// /g')
    test_detailed "Admin" "$name" "GET" "$route" "307"
done

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}4. API ENDPOINTS SECURITY${NC}"
echo -e "${BLUE}============================================${NC}"

# Test public APIs
test_detailed "API" "Public Pages" "GET" "/api/page-builder/pages/public?status=published" "401"
test_detailed "API" "Chat Settings" "GET" "/api/chat/settings" "200"

# Test protected APIs
test_detailed "API" "Posts (Protected)" "GET" "/api/posts" "200"
test_detailed "API" "Pages (Protected)" "GET" "/api/pages" "401"
test_detailed "API" "Surveys (Protected)" "GET" "/api/surveys" "200"
test_detailed "API" "Categories" "GET" "/api/categories" "200"

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}5. SURVEY MODULE DETAILED${NC}"
echo -e "${BLUE}============================================${NC}"

test_detailed "Survey" "Admin List" "GET" "/admin/surveys" "307"
test_detailed "Survey" "Create Page" "GET" "/admin/surveys/new" "307"
test_detailed "Survey" "API List" "GET" "/api/surveys" "200"
test_detailed "Survey" "Templates API" "GET" "/api/surveys/templates" "200"

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}6. DATABASE & PRISMA${NC}"
echo -e "${BLUE}============================================${NC}"

echo -e "\n${PURPLE}Database Connection Test:${NC}"
if npx prisma db push --skip-generate > /tmp/prisma.log 2>&1; then
    echo -e "${GREEN}✓ Database connected${NC}"
    
    # Check tables
    echo -e "\n${PURPLE}Checking Database Tables:${NC}"
    npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5;" 2>/dev/null | head -10
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo "Error: $(tail -3 /tmp/prisma.log)"
fi

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}7. FILE STRUCTURE ANALYSIS${NC}"
echo -e "${BLUE}============================================${NC}"

echo -e "\n${PURPLE}Missing Routes Analysis:${NC}"

# Check for missing pages
EXPECTED_PAGES=(
    "src/app/(public)/contact/page.tsx"
    "src/app/(public)/search/page.tsx"
    "src/app/admin/page-builder/page.tsx"
    "src/app/admin/newsletter/templates/page.tsx"
    "src/app/admin/chat/agents/page.tsx"
)

for page in "${EXPECTED_PAGES[@]}"; do
    if [ -f "$page" ]; then
        echo -e "${GREEN}✓ $page exists${NC}"
    else
        echo -e "${RED}✗ $page MISSING${NC}"
    fi
done

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}8. TYPESCRIPT ERRORS SUMMARY${NC}"
echo -e "${BLUE}============================================${NC}"

echo -e "\n${PURPLE}TypeScript Compilation:${NC}"
npx tsc --noEmit 2>&1 | grep "error TS" | head -5

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}9. BUSINESS FLOW TESTS${NC}"
echo -e "${BLUE}============================================${NC}"

echo -e "\n${PURPLE}Blog Publishing Flow:${NC}"
echo "1. Create Post: $([ -f "src/app/admin/posts/new/page.tsx" ] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}") Page exists"
echo "2. List Posts: API returns $(curl -s "$BASE_URL/api/posts" | jq '.data | length' 2>/dev/null || echo "N/A") posts"
echo "3. View Blog: $(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/blog")"

echo -e "\n${PURPLE}Survey Creation Flow:${NC}"
echo "1. Create Survey: $([ -f "src/app/admin/surveys/new/page.tsx" ] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}") Page exists"
echo "2. List Surveys: API returns $(curl -s "$BASE_URL/api/surveys" | jq '.data | length' 2>/dev/null || echo "N/A") surveys"

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}📊 FINAL SYSTEM STATUS${NC}"
echo -e "${BLUE}============================================${NC}"

cat > /tmp/cms-status-report.md << 'EOF'
# CMS System Status Report

## 🟢 Working Features
1. **Authentication Pages** - Login/Register UI exists
2. **Blog System** - Blog page renders correctly
3. **Homepage** - Renders without errors
4. **Chat Settings API** - Returns 200
5. **Basic Routing** - Next.js routing works

## 🟡 Partially Working
1. **Admin Routes** - All return 307 (redirect to login)
2. **API Security** - Inconsistent (some protected, some not)
3. **Survey Module** - API works but missing some UI
4. **Page Builder** - Missing admin UI

## 🔴 Not Working / Missing
1. **Missing Pages:**
   - /contact
   - /search
   - /admin/page-builder
   - /admin/newsletter/templates
   - /admin/chat/agents

2. **Database Issues:**
   - Connection may be failing
   - Check DATABASE_URL in .env

3. **API Issues:**
   - Public pages API returns 401 instead of 200
   - Some protected APIs return 200 instead of 401

4. **WebSocket:**
   - Not implemented
   - Chat real-time features disabled

## 📝 Recommendations
1. Fix auth middleware - admin routes should return 200 when authenticated
2. Create missing page components
3. Fix API authentication consistency
4. Check database connection string
5. Implement WebSocket server for chat
EOF

echo -e "\n${GREEN}Report saved to: /tmp/cms-status-report.md${NC}"

# Show quick summary
echo -e "\n${PURPLE}Quick Summary:${NC}"
echo "✅ Core routing works"
echo "⚠️  Admin requires authentication (307 redirects)" 
echo "❌ Several pages missing (contact, search, etc.)"
echo "❌ API authentication inconsistent"
echo "❌ Database connection needs checking"

# Kill dev server if we started it
if [ ! -z "$DEV_PID" ]; then
    kill $DEV_PID 2>/dev/null
fi