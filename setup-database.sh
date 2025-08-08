#!/bin/bash

echo "╔══════════════════════════════════════════════════╗"
echo "║   🗄️  Database Setup for Personal Assistant     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Please enter your database password:${NC}"
echo -e "${BLUE}(Password จะไม่แสดงบนหน้าจอเพื่อความปลอดภัย)${NC}"
read -s DB_PASSWORD

# Update DATABASE_URL with real password
DATABASE_URL="postgresql://doadmin:${DB_PASSWORD}@db-postgresql-sgp1-43887-do-user-24411302-0.m.db.ondigitalocean.com:25060/personalAI?sslmode=require"

# Test connection
echo ""
echo -e "${BLUE}Testing database connection...${NC}"
export DATABASE_URL="$DATABASE_URL"

# Generate Prisma Client
echo -e "${YELLOW}Generating Prisma Client...${NC}"
npx prisma generate

# Push schema to database
echo -e "${YELLOW}Creating database tables...${NC}"
npx prisma db push --skip-generate

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Database setup successful!${NC}"
    
    # Update .env.local with the correct password
    echo ""
    echo -e "${YELLOW}Do you want to save the password to .env.local? (y/n)${NC}"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Backup current .env.local
        cp .env.local .env.local.backup
        
        # Update password in .env.local
        sed -i.bak "s|show-password|${DB_PASSWORD}|g" .env.local
        echo -e "${GREEN}✅ Password saved to .env.local${NC}"
        echo -e "${BLUE}   Backup saved to .env.local.backup${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           Database Ready!                       ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}You can now run:${NC}"
    echo -e "  ${YELLOW}npm run dev${NC}     - For development"
    echo -e "  ${YELLOW}npm run build${NC}   - Build for production"
    echo -e "  ${YELLOW}npm start${NC}       - Run production server"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Database setup failed${NC}"
    echo -e "${YELLOW}Please check your password and try again${NC}"
    exit 1
fi