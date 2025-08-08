#!/bin/bash

# Setup Production Environment Variables
# This script helps generate secure secrets and set up production environment

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Production Environment Setup ===${NC}\n"

# Check if .env.production exists
if [ -f ".env.production" ]; then
    echo -e "${YELLOW}Warning: .env.production already exists${NC}"
    read -p "Do you want to backup and create a new one? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        backup_file=".env.production.backup.$(date +%Y%m%d_%H%M%S)"
        cp .env.production "$backup_file"
        echo -e "${GREEN}Backup created: $backup_file${NC}"
    else
        echo -e "${RED}Exiting without changes${NC}"
        exit 1
    fi
fi

# Copy example file
cp .env.production.example .env.production
echo -e "${GREEN}Created .env.production from example${NC}\n"

# Function to generate secure random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to generate hex string for encryption
generate_hex() {
    openssl rand -hex 16
}

# Generate secrets
echo -e "${BLUE}Generating secure secrets...${NC}"

NEXTAUTH_SECRET=$(generate_secret)
JWT_SECRET=$(generate_secret)
ENCRYPTION_KEY=$(generate_hex)

# Update .env.production with generated secrets
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/generate-with-openssl-rand-base64-32/$NEXTAUTH_SECRET/g" .env.production
    sed -i '' "s/generate-with-openssl-rand-base64-32/$JWT_SECRET/g" .env.production
    sed -i '' "s/generate-32-char-hex-string-for-aes256/$ENCRYPTION_KEY/g" .env.production
else
    # Linux
    sed -i "s/generate-with-openssl-rand-base64-32/$NEXTAUTH_SECRET/g" .env.production
    sed -i "s/generate-with-openssl-rand-base64-32/$JWT_SECRET/g" .env.production
    sed -i "s/generate-32-char-hex-string-for-aes256/$ENCRYPTION_KEY/g" .env.production
fi

echo -e "${GREEN}✓ Generated NEXTAUTH_SECRET${NC}"
echo -e "${GREEN}✓ Generated JWT_SECRET${NC}"
echo -e "${GREEN}✓ Generated ENCRYPTION_KEY${NC}\n"

# Prompt for required values
echo -e "${BLUE}Please provide the following production values:${NC}\n"

read -p "Domain (e.g., example.com): " DOMAIN
read -p "Database URL: " DATABASE_URL
read -p "SMTP Host: " SMTP_HOST
read -p "SMTP User: " SMTP_USER
read -sp "SMTP Password: " SMTP_PASS
echo
read -p "Redis URL (optional, press enter to skip): " REDIS_URL
read -p "Sentry DSN (optional, press enter to skip): " SENTRY_DSN

# Update .env.production with user values
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|your-domain.com|$DOMAIN|g" .env.production
    sed -i '' "s|postgresql://username:password@your-db-host:5432/cms_prod?schema=public&connection_limit=5|$DATABASE_URL|g" .env.production
    sed -i '' "s|smtp.sendgrid.net|$SMTP_HOST|g" .env.production
    sed -i '' "s|apikey|$SMTP_USER|g" .env.production
    sed -i '' "s|your-sendgrid-api-key|$SMTP_PASS|g" .env.production
    
    if [ ! -z "$REDIS_URL" ]; then
        sed -i '' "s|redis://your-redis-host:6379|$REDIS_URL|g" .env.production
    fi
    
    if [ ! -z "$SENTRY_DSN" ]; then
        sed -i '' "s|your-sentry-dsn|$SENTRY_DSN|g" .env.production
    fi
else
    # Linux
    sed -i "s|your-domain.com|$DOMAIN|g" .env.production
    sed -i "s|postgresql://username:password@your-db-host:5432/cms_prod?schema=public&connection_limit=5|$DATABASE_URL|g" .env.production
    sed -i "s|smtp.sendgrid.net|$SMTP_HOST|g" .env.production
    sed -i "s|apikey|$SMTP_USER|g" .env.production
    sed -i "s|your-sendgrid-api-key|$SMTP_PASS|g" .env.production
    
    if [ ! -z "$REDIS_URL" ]; then
        sed -i "s|redis://your-redis-host:6379|$REDIS_URL|g" .env.production
    fi
    
    if [ ! -z "$SENTRY_DSN" ]; then
        sed -i "s|your-sentry-dsn|$SENTRY_DSN|g" .env.production
    fi
fi

echo -e "\n${GREEN}✓ Production environment file created successfully!${NC}\n"

# Security check
echo -e "${BLUE}Running security checks...${NC}"

# Check file permissions
chmod 600 .env.production
echo -e "${GREEN}✓ Set secure file permissions (600)${NC}"

# Create .gitignore entry if not exists
if ! grep -q "^.env.production$" .gitignore 2>/dev/null; then
    echo ".env.production" >> .gitignore
    echo -e "${GREEN}✓ Added .env.production to .gitignore${NC}"
fi

echo -e "\n${BLUE}Production Checklist:${NC}"
echo "1. ✓ Secure secrets generated"
echo "2. ✓ Environment variables configured"
echo "3. ✓ File permissions secured"
echo "4. ✓ Git ignore configured"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review .env.production and adjust any settings"
echo "2. Set up your database with the provided connection string"
echo "3. Configure your email service"
echo "4. Set up Redis if using caching/sessions"
echo "5. Configure monitoring with Sentry"
echo "6. Set up SSL certificates for HTTPS"
echo "7. Configure your reverse proxy (nginx/Apache)"
echo ""
echo -e "${GREEN}Production environment setup complete!${NC}"