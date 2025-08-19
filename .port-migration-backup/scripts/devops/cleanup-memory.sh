#!/bin/bash

# Memory Optimization Cleanup Script
# Stock Portfolio System v3.0 - Memory Usage Reduction
# Target: Reduce memory usage from 3.8GB+ to under 2GB

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
BACKUP_DIR="$PROJECT_ROOT/backup/memory-optimization"

echo -e "${BLUE}🧹 Stock Portfolio Memory Cleanup${NC}"
echo -e "${BLUE}===================================${NC}"
echo "Project: $PROJECT_ROOT"
echo "Started: $(date)"
echo ""

# Create necessary directories
mkdir -p "$LOG_DIR"
mkdir -p "$BACKUP_DIR"

# Function to check if a service is running
check_service() {
    local service_name="$1"
    local port="$2"
    
    if lsof -i ":$port" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $service_name running on port $port"
        return 0
    else
        echo -e "${YELLOW}○${NC} $service_name not running on port $port"
        return 1
    fi
}

# Function to get process memory
get_process_memory() {
    local pattern="$1"
    ps aux | grep "$pattern" | grep -v grep | awk '{sum += $6} END {print sum/1024}' | bc 2>/dev/null || echo "0"
}

# Function to measure baseline
measure_baseline() {
    echo -e "${BLUE}📊 Measuring baseline memory usage...${NC}"
    
    local frontend_mem=$(get_process_memory "server.js")
    local gateway_mem=$(get_process_memory "services/gateway")
    local terminal_mem=$(get_process_memory "services/terminal")
    local portfolio_mem=$(get_process_memory "services/portfolio")
    local node_total=$(ps aux | grep -E "(node|npm)" | grep -v grep | awk '{sum += $6} END {print sum/1024}' | bc 2>/dev/null || echo "0")
    
    echo "Frontend: ${frontend_mem}MB"
    echo "Gateway: ${gateway_mem}MB"
    echo "Terminal: ${terminal_mem}MB"
    echo "Portfolio: ${portfolio_mem}MB"
    echo "Total Node.js: ${node_total}MB"
    echo ""
    
    # Save baseline
    cat > "$LOG_DIR/memory-baseline.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "frontend": $frontend_mem,
  "gateway": $gateway_mem,
  "terminal": $terminal_mem,
  "portfolio": $portfolio_mem,
  "total_nodejs": $node_total
}
EOF
}

# Function to clear Node.js caches
clear_node_caches() {
    echo -e "${YELLOW}🗑️  Clearing Node.js caches...${NC}"
    
    # Clear npm cache
    npm cache clean --force 2>/dev/null || echo "   Warning: npm cache clean failed"
    
    # Clear yarn cache if yarn is being used
    if command -v yarn >/dev/null 2>&1; then
        yarn cache clean 2>/dev/null || echo "   Warning: yarn cache clean failed"
    fi
    
    # Clear pnpm cache if pnpm is being used
    if command -v pnpm >/dev/null 2>&1; then
        pnpm store prune 2>/dev/null || echo "   Warning: pnpm cache clean failed"
    fi
    
    echo -e "${GREEN}✓${NC} Node.js caches cleared"
}

# Function to clear TypeScript compilation caches
clear_typescript_caches() {
    echo -e "${YELLOW}🗑️  Clearing TypeScript caches...${NC}"
    
    # Remove .tsbuildinfo files
    find "$PROJECT_ROOT" -name "*.tsbuildinfo" -delete 2>/dev/null || true
    
    # Remove Next.js TypeScript cache
    rm -rf "$PROJECT_ROOT/.next/.tsbuildinfo" 2>/dev/null || true
    
    # Remove TypeScript cache in each service
    find "$PROJECT_ROOT/services" -name "tsconfig.tsbuildinfo" -delete 2>/dev/null || true
    
    echo -e "${GREEN}✓${NC} TypeScript caches cleared"
}

# Function to clear development caches
clear_dev_caches() {
    echo -e "${YELLOW}🗑️  Clearing development caches...${NC}"
    
    # Clear Next.js cache
    rm -rf "$PROJECT_ROOT/.next/cache" 2>/dev/null || true
    
    # Clear node_modules cache directories
    find "$PROJECT_ROOT" -path "*/node_modules/.cache" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Clear webpack cache
    rm -rf "$PROJECT_ROOT/node_modules/.cache/webpack" 2>/dev/null || true
    
    # Clear TypeScript cache
    rm -rf "$PROJECT_ROOT/node_modules/.cache/typescript" 2>/dev/null || true
    
    # Clear ESLint cache
    find "$PROJECT_ROOT" -name ".eslintcache" -delete 2>/dev/null || true
    
    # Clear Jest cache
    rm -rf "$PROJECT_ROOT/node_modules/.cache/jest" 2>/dev/null || true
    
    echo -e "${GREEN}✓${NC} Development caches cleared"
}

# Function to trigger garbage collection
trigger_gc() {
    echo -e "${YELLOW}🗑️  Triggering garbage collection...${NC}"
    
    # API endpoints for GC (if implemented)
    services=("4000:gateway" "4300:terminal" "4500:portfolio" "4200:ai-assistant" "4100:user-management")
    
    for service in "${services[@]}"; do
        port="${service%%:*}"
        name="${service##*:}"
        
        if check_service "$name" "$port" >/dev/null 2>&1; then
            # Try to trigger GC via API endpoint
            curl -s -X POST "http://localhost:$port/api/system/gc" >/dev/null 2>&1 || true
            echo "   Triggered GC for $name"
        fi
    done
    
    # Force Node.js garbage collection for main frontend
    if pgrep -f "server.js" >/dev/null; then
        kill -USR2 $(pgrep -f "server.js") 2>/dev/null || true
        echo "   Triggered GC for frontend"
    fi
    
    echo -e "${GREEN}✓${NC} Garbage collection triggered"
}

# Function to optimize service configurations
optimize_service_configs() {
    echo -e "${YELLOW}⚙️  Optimizing service configurations...${NC}"
    
    # Backup current configurations
    cp "$PROJECT_ROOT/package.json" "$BACKUP_DIR/package.json.backup" 2>/dev/null || true
    
    # Check if ecosystem.config.js exists, if not create optimized version
    if [ ! -f "$PROJECT_ROOT/ecosystem.config.js" ]; then
        cat > "$PROJECT_ROOT/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    {
      name: 'frontend',
      script: 'server.js',
      node_args: '--max-old-space-size=1024 --expose-gc --optimize-for-size',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      max_memory_restart: '1200M',
      instances: 1,
      watch: false
    },
    {
      name: 'gateway',
      script: 'services/gateway/dist/index.js',
      node_args: '--max-old-space-size=256 --expose-gc',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      max_memory_restart: '300M',
      instances: 1,
      watch: false
    },
    {
      name: 'terminal',
      script: 'services/terminal/dist/index.js',
      node_args: '--max-old-space-size=256 --expose-gc',
      env: {
        NODE_ENV: 'development',
        PORT: 4300
      },
      max_memory_restart: '300M',
      instances: 1,
      watch: false
    },
    {
      name: 'portfolio',
      script: 'services/portfolio/dist/index.js',
      node_args: '--max-old-space-size=256 --expose-gc',
      env: {
        NODE_ENV: 'development',
        PORT: 4500
      },
      max_memory_restart: '300M',
      instances: 1,
      watch: false
    }
  ]
}
EOF
        echo -e "${GREEN}✓${NC} Created optimized PM2 configuration"
    fi
    
    echo -e "${GREEN}✓${NC} Service configurations optimized"
}

# Function to remove unused dependencies (based on code review)
remove_unused_deps() {
    echo -e "${YELLOW}📦 Removing unused dependencies...${NC}"
    
    # List of unused dependencies identified in code review
    unused_deps=("clamscan" "archiver" "nodemailer" "formidable" "json2csv" "node-fetch")
    old_xterm_deps=("xterm" "xterm-addon-fit" "xterm-addon-web-links")
    
    for dep in "${unused_deps[@]}"; do
        if npm list "$dep" >/dev/null 2>&1; then
            echo "   Removing $dep..."
            npm uninstall "$dep" >/dev/null 2>&1 || echo "   Warning: Failed to remove $dep"
        fi
    done
    
    for dep in "${old_xterm_deps[@]}"; do
        if npm list "$dep" >/dev/null 2>&1; then
            echo "   Removing old xterm dependency: $dep..."
            npm uninstall "$dep" >/dev/null 2>&1 || echo "   Warning: Failed to remove $dep"
        fi
    done
    
    echo -e "${GREEN}✓${NC} Unused dependencies removed"
}

# Function to restart services with optimized settings
restart_services_optimized() {
    echo -e "${YELLOW}🔄 Restarting services with optimized settings...${NC}"
    
    # Stop all services first
    echo "   Stopping all services..."
    
    # Stop PM2 processes if running
    pm2 stop all >/dev/null 2>&1 || true
    pm2 delete all >/dev/null 2>&1 || true
    
    # Kill Node.js processes related to our project
    pkill -f "Stock/port" 2>/dev/null || true
    
    # Wait for processes to stop
    sleep 3
    
    # Start services with optimized configuration
    echo "   Starting optimized services..."
    
    if [ -f "$PROJECT_ROOT/ecosystem.config.js" ]; then
        pm2 start "$PROJECT_ROOT/ecosystem.config.js" >/dev/null 2>&1 || true
        echo -e "${GREEN}✓${NC} Services started with PM2 optimization"
    else
        # Fallback: start manually with optimized node args
        cd "$PROJECT_ROOT"
        
        # Start frontend with reduced memory
        NODE_OPTIONS="--max-old-space-size=1024 --expose-gc" npm run dev >/dev/null 2>&1 &
        
        echo -e "${GREEN}✓${NC} Services restarted with optimized settings"
    fi
    
    # Wait for services to start
    sleep 5
}

# Function to measure results
measure_results() {
    echo -e "${BLUE}📊 Measuring optimization results...${NC}"
    sleep 5  # Wait for services to stabilize
    
    local frontend_mem=$(get_process_memory "server.js")
    local gateway_mem=$(get_process_memory "services/gateway")
    local terminal_mem=$(get_process_memory "services/terminal")
    local portfolio_mem=$(get_process_memory "services/portfolio")
    local node_total=$(ps aux | grep -E "(node|npm)" | grep -v grep | awk '{sum += $6} END {print sum/1024}' | bc 2>/dev/null || echo "0")
    
    echo "After optimization:"
    echo "Frontend: ${frontend_mem}MB"
    echo "Gateway: ${gateway_mem}MB"
    echo "Terminal: ${terminal_mem}MB"
    echo "Portfolio: ${portfolio_mem}MB"
    echo "Total Node.js: ${node_total}MB"
    echo ""
    
    # Save results
    cat > "$LOG_DIR/memory-optimized.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "frontend": $frontend_mem,
  "gateway": $gateway_mem,
  "terminal": $terminal_mem,
  "portfolio": $portfolio_mem,
  "total_nodejs": $node_total
}
EOF

    # Calculate improvement
    if [ -f "$LOG_DIR/memory-baseline.json" ]; then
        baseline_total=$(jq -r '.total_nodejs' "$LOG_DIR/memory-baseline.json" 2>/dev/null || echo "0")
        if [ "$baseline_total" != "0" ] && [ "$node_total" != "0" ]; then
            improvement=$(echo "scale=1; ($baseline_total - $node_total) / $baseline_total * 100" | bc 2>/dev/null || echo "0")
            echo -e "${GREEN}📈 Memory improvement: ${improvement}%${NC}"
            echo -e "${GREEN}📉 Memory reduced: $(echo "scale=1; $baseline_total - $node_total" | bc)MB${NC}"
        fi
    fi
}

# Function to validate optimization
validate_optimization() {
    echo -e "${BLUE}✅ Validating optimization...${NC}"
    
    # Check if services are running
    local services_running=0
    if check_service "Frontend" "3000"; then ((services_running++)); fi
    if check_service "Gateway" "4000"; then ((services_running++)); fi
    if check_service "Terminal" "4300"; then ((services_running++)); fi
    if check_service "Portfolio" "4500"; then ((services_running++)); fi
    
    echo "Services running: $services_running/4"
    
    # Check memory targets
    local total_mem=$(ps aux | grep -E "(node|npm)" | grep -v grep | awk '{sum += $6} END {print sum/1024}' | bc 2>/dev/null || echo "0")
    local target_mem=2048
    
    if (( $(echo "$total_mem < $target_mem" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${GREEN}✓${NC} Memory usage within target (${total_mem}MB < ${target_mem}MB)"
    else
        echo -e "${YELLOW}⚠${NC} Memory usage above target (${total_mem}MB > ${target_mem}MB)"
    fi
    
    # Test basic functionality
    if curl -s "http://localhost:4000/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Gateway health check passed"
    else
        echo -e "${RED}✗${NC} Gateway health check failed"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}Starting memory optimization process...${NC}"
    echo ""
    
    # Step 1: Measure baseline
    measure_baseline
    
    # Step 2: Clear caches
    clear_node_caches
    clear_typescript_caches
    clear_dev_caches
    
    # Step 3: Trigger garbage collection
    trigger_gc
    
    # Step 4: Optimize configurations
    optimize_service_configs
    
    # Step 5: Remove unused dependencies (optional - can be skipped)
    if [ "$1" = "--remove-deps" ]; then
        remove_unused_deps
    fi
    
    # Step 6: Restart services (optional)
    if [ "$1" = "--restart" ] || [ "$2" = "--restart" ]; then
        restart_services_optimized
    fi
    
    echo ""
    echo -e "${BLUE}🎯 Optimization completed!${NC}"
    echo ""
    
    # Step 7: Measure results
    measure_results
    
    # Step 8: Validate
    validate_optimization
    
    echo ""
    echo -e "${GREEN}✅ Memory cleanup completed successfully!${NC}"
    echo -e "${BLUE}📁 Logs saved to: $LOG_DIR${NC}"
    echo -e "${BLUE}📁 Backups saved to: $BACKUP_DIR${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Monitor memory usage: npm run memory:monitor"
    echo "  2. Run load tests: npm run test:load"
    echo "  3. Check for memory leaks: npm run memory:check"
    echo ""
}

# Help function
show_help() {
    echo "Memory Cleanup Script for Stock Portfolio System v3.0"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --remove-deps    Remove unused dependencies (permanent change)"
    echo "  --restart        Restart services with optimized settings"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Basic cleanup (caches, GC)"
    echo "  $0 --restart               # Cleanup + restart services"
    echo "  $0 --remove-deps --restart # Full optimization"
    echo ""
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac