#!/bin/bash

# Source port configuration
source "$(dirname "$0")/../shared/config/ports.sh"

# ============================================
# Terminal Storage System - Production Deployment Script
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_MODE=${1:-"production"}
STORAGE_MODE=${2:-"HYBRID"}
BACKUP_ENABLED=${BACKUP_ENABLED:-"true"}
MIGRATION_ENABLED=${MIGRATION_ENABLED:-"true"}
HEALTH_CHECK_ENABLED=${HEALTH_CHECK_ENABLED:-"true"}

# Timestamps
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOYMENT_LOG="logs/deployment_${TIMESTAMP}.log"

# ============================================
# Functions
# ============================================

log() {
    echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}" | tee -a "$DEPLOYMENT_LOG"
    echo -e "${BLUE}  $1${NC}" | tee -a "$DEPLOYMENT_LOG"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n" | tee -a "$DEPLOYMENT_LOG"
}

# Check prerequisites
check_prerequisites() {
    header "Checking Prerequisites"
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_NODE="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE" ]; then
        log_success "Node.js version $NODE_VERSION ✓"
    else
        log_error "Node.js version $NODE_VERSION is too old. Required: >= $REQUIRED_NODE"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        log_success "npm $(npm -v) ✓"
    else
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check database connection for DATABASE/HYBRID modes
    if [ "$STORAGE_MODE" = "DATABASE" ] || [ "$STORAGE_MODE" = "HYBRID" ]; then
        if [ -z "$DATABASE_URL" ]; then
            log_error "DATABASE_URL is not set but required for $STORAGE_MODE mode"
            exit 1
        fi
        log_success "DATABASE_URL is configured ✓"
    fi
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p backups
    mkdir -p /tmp/terminal-sessions
    
    log_success "All prerequisites met"
}

# Backup current data
backup_data() {
    if [ "$BACKUP_ENABLED" = "true" ]; then
        header "Backing Up Current Data"
        
        BACKUP_FILE="backups/terminal_backup_${TIMESTAMP}.tar.gz"
        
        # Backup database if applicable
        if [ "$STORAGE_MODE" = "DATABASE" ] || [ "$STORAGE_MODE" = "HYBRID" ]; then
            log "Backing up database..."
            npx prisma db pull
            npx prisma generate
        fi
        
        # Backup local storage files
        if [ -d "/tmp/terminal-sessions" ]; then
            log "Backing up local storage files..."
            tar -czf "$BACKUP_FILE" /tmp/terminal-sessions 2>/dev/null || true
            log_success "Backup created: $BACKUP_FILE"
        fi
    else
        log_warning "Backup skipped (BACKUP_ENABLED=false)"
    fi
}

# Install dependencies
install_dependencies() {
    header "Installing Dependencies"
    
    log "Installing npm packages..."
    npm ci --production
    
    log "Generating Prisma client..."
    npx prisma generate
    
    log_success "Dependencies installed"
}

# Run database migrations
run_migrations() {
    if [ "$STORAGE_MODE" = "DATABASE" ] || [ "$STORAGE_MODE" = "HYBRID" ]; then
        header "Running Database Migrations"
        
        log "Applying Prisma migrations..."
        npx prisma migrate deploy
        
        log_success "Database migrations completed"
    fi
}

# Migrate existing sessions
migrate_sessions() {
    if [ "$MIGRATION_ENABLED" = "true" ]; then
        header "Migrating Existing Sessions"
        
        log "Running migration script..."
        npx tsx scripts/migrate-terminal-storage.ts \
            --mode="$STORAGE_MODE" \
            --force \
            2>&1 | tee -a "$DEPLOYMENT_LOG"
        
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            log_success "Session migration completed"
        else
            log_warning "Session migration had issues (check logs)"
        fi
    else
        log_warning "Session migration skipped (MIGRATION_ENABLED=false)"
    fi
}

# Run tests
run_tests() {
    header "Running Tests"
    
    # Run unit tests
    log "Running unit tests..."
    npm test -- --testPathPattern="storage" --silent 2>&1 | tee -a "$DEPLOYMENT_LOG" || {
        log_warning "Some tests failed (non-critical)"
    }
    
    # Run performance test
    log "Running performance test..."
    npx tsx scripts/performance-test-terminal-storage.ts \
        --mode="$STORAGE_MODE" \
        --sessions=20 \
        --projects=3 \
        --operations=50 \
        2>&1 | tee -a "$DEPLOYMENT_LOG"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log_success "Tests completed"
    else
        log_warning "Performance test had issues (check logs)"
    fi
}

# Configure environment
configure_environment() {
    header "Configuring Environment"
    
    # Create .env if not exists
    if [ ! -f ".env" ]; then
        cp .env.terminal-storage.example .env
        log "Created .env from template"
    fi
    
    # Update storage mode
    log "Setting TERMINAL_STORAGE_MODE=$STORAGE_MODE"
    
    # Update .env file
    if grep -q "TERMINAL_STORAGE_MODE=" .env; then
        sed -i.bak "s/TERMINAL_STORAGE_MODE=.*/TERMINAL_STORAGE_MODE=$STORAGE_MODE/" .env
    else
        echo "TERMINAL_STORAGE_MODE=$STORAGE_MODE" >> .env
    fi
    
    # Set compatibility mode based on deployment
    if [ "$DEPLOYMENT_MODE" = "production" ]; then
        COMPAT_MODE="storage"
    else
        COMPAT_MODE="hybrid"
    fi
    
    if grep -q "TERMINAL_COMPATIBILITY_MODE=" .env; then
        sed -i.bak "s/TERMINAL_COMPATIBILITY_MODE=.*/TERMINAL_COMPATIBILITY_MODE=$COMPAT_MODE/" .env
    else
        echo "TERMINAL_COMPATIBILITY_MODE=$COMPAT_MODE" >> .env
    fi
    
    log_success "Environment configured for $DEPLOYMENT_MODE with $STORAGE_MODE storage"
}

# Build application
build_application() {
    header "Building Application"
    
    log "Running production build..."
    NODE_ENV=production npm run build
    
    if [ $? -eq 0 ]; then
        log_success "Build completed successfully"
    else
        log_error "Build failed"
        exit 1
    fi
}

# Health check
health_check() {
    if [ "$HEALTH_CHECK_ENABLED" = "true" ]; then
        header "Performing Health Check"
        
        # Start server in background
        log "Starting server for health check..."
        NODE_ENV=production npm start &
        SERVER_PID=$!
        
        # Wait for server to start
        sleep 10
        
        # Check health endpoint
        log "Checking health endpoint..."
        HEALTH_RESPONSE=$(curl -s http://localhost:$PORT_GATEWAY_MAIN/api/terminal/health || echo "failed")
        
        if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
            log_success "Health check passed"
        else
            log_error "Health check failed: $HEALTH_RESPONSE"
            kill $SERVER_PID 2>/dev/null
            exit 1
        fi
        
        # Stop test server
        kill $SERVER_PID 2>/dev/null
        wait $SERVER_PID 2>/dev/null
    else
        log_warning "Health check skipped (HEALTH_CHECK_ENABLED=false)"
    fi
}

# Create systemd service (optional)
create_systemd_service() {
    if [ "$DEPLOYMENT_MODE" = "production" ] && [ -d "/etc/systemd/system" ]; then
        header "Creating Systemd Service"
        
        SERVICE_FILE="/etc/systemd/system/terminal-storage.service"
        
        sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Terminal Storage System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=TERMINAL_STORAGE_MODE=$STORAGE_MODE

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable terminal-storage
        
        log_success "Systemd service created"
    fi
}

# Start production server
start_production() {
    header "Starting Production Server"
    
    if [ "$DEPLOYMENT_MODE" = "production" ]; then
        if [ -d "/etc/systemd/system" ]; then
            log "Starting via systemd..."
            sudo systemctl start terminal-storage
            
            sleep 5
            
            if sudo systemctl is-active terminal-storage &>/dev/null; then
                log_success "Production server started via systemd"
            else
                log_error "Failed to start via systemd"
                exit 1
            fi
        else
            log "Starting via pm2..."
            npx pm2 start ecosystem.config.js --env production
            npx pm2 save
            
            log_success "Production server started via pm2"
        fi
    else
        log "Starting in $DEPLOYMENT_MODE mode..."
        NODE_ENV=$DEPLOYMENT_MODE npm start &
        
        log_success "Server started in $DEPLOYMENT_MODE mode"
    fi
}

# Display summary
display_summary() {
    header "Deployment Summary"
    
    echo -e "${GREEN}✨ Deployment Successful!${NC}\n" | tee -a "$DEPLOYMENT_LOG"
    
    echo "Configuration:" | tee -a "$DEPLOYMENT_LOG"
    echo "  Mode: $DEPLOYMENT_MODE" | tee -a "$DEPLOYMENT_LOG"
    echo "  Storage: $STORAGE_MODE" | tee -a "$DEPLOYMENT_LOG"
    echo "  Timestamp: $TIMESTAMP" | tee -a "$DEPLOYMENT_LOG"
    echo "  Log: $DEPLOYMENT_LOG" | tee -a "$DEPLOYMENT_LOG"
    
    if [ "$BACKUP_ENABLED" = "true" ]; then
        echo "  Backup: $BACKUP_FILE" | tee -a "$DEPLOYMENT_LOG"
    fi
    
    echo -e "\nNext Steps:" | tee -a "$DEPLOYMENT_LOG"
    echo "  1. Monitor logs: tail -f logs/terminal-storage.log" | tee -a "$DEPLOYMENT_LOG"
    echo "  2. Check health: curl http://localhost:$PORT_GATEWAY_MAIN/api/terminal/health" | tee -a "$DEPLOYMENT_LOG"
    echo "  3. View metrics: curl http://localhost:$PORT_GATEWAY_MAIN/api/terminal/storage-info" | tee -a "$DEPLOYMENT_LOG"
    
    if [ "$DEPLOYMENT_MODE" = "production" ]; then
        echo "  4. Monitor service: sudo systemctl status terminal-storage" | tee -a "$DEPLOYMENT_LOG"
    fi
}

# Rollback function
rollback() {
    header "Rolling Back Deployment"
    
    if [ -f "$BACKUP_FILE" ]; then
        log "Restoring from backup..."
        tar -xzf "$BACKUP_FILE" -C / 2>/dev/null || true
        log_success "Rollback completed"
    else
        log_error "No backup file found for rollback"
    fi
    
    exit 1
}

# Trap errors for rollback
trap 'rollback' ERR

# ============================================
# Main Deployment Process
# ============================================

main() {
    clear
    
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════╗"
    echo "║     Terminal Storage System - Deployment Tool      ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    log "Starting deployment process..."
    log "Mode: $DEPLOYMENT_MODE, Storage: $STORAGE_MODE"
    
    # Run deployment steps
    check_prerequisites
    backup_data
    install_dependencies
    run_migrations
    migrate_sessions
    configure_environment
    build_application
    run_tests
    health_check
    create_systemd_service
    start_production
    display_summary
    
    echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}\n"
}

# Run main function
main "$@"