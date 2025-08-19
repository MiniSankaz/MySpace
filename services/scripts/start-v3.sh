#!/bin/bash

# ================================================================
# Stock Portfolio v3.0 Microservices - Start Script
# ================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/sem4pro/Stock/port"
SERVICES_DIR="$PROJECT_ROOT/services"
LOG_DIR="$PROJECT_ROOT/logs"

# Service definitions with ports (using arrays for compatibility)
SERVICES="gateway:4000 user-management:4100 ai-assistant:4200 terminal:4300 workspace:4400 portfolio:4500"

# Environment
ENVIRONMENT=${NODE_ENV:-development}
STARTUP_MODE=${1:-parallel} # parallel, sequential, selective
SELECTED_SERVICES=${2:-""} # comma-separated list for selective mode

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE} Stock Portfolio v3.0 - Microservices${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "Environment: ${ENVIRONMENT}"
    echo -e "Mode: ${STARTUP_MODE}"
    echo -e "Project Root: ${PROJECT_ROOT}"
    echo -e "Services Directory: ${SERVICES_DIR}"
    echo -e "${BLUE}========================================${NC}\n"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 is not installed. Installing globally..."
        npm install -g pm2
    fi
    
    # Check if TypeScript is available
    if ! command -v tsc &> /dev/null && ! npx tsc --version &> /dev/null; then
        log_warning "TypeScript is not installed. Installing globally..."
        npm install -g typescript
    fi
    
    # Create logs directory
    mkdir -p "$LOG_DIR"
    
    log_success "Prerequisites check completed"
}

check_ports() {
    log_info "Checking port availability..."
    
    local unavailable_ports=()
    
    for service in "${!SERVICES[@]}"; do
        local port="${SERVICES[$service]}"
        if lsof -i :$port > /dev/null 2>&1; then
            unavailable_ports+=("$service:$port")
        fi
    done
    
    if [ ${#unavailable_ports[@]} -gt 0 ]; then
        log_warning "The following ports are already in use:"
        for port_info in "${unavailable_ports[@]}"; do
            echo "  - $port_info"
        done
        
        read -p "Do you want to kill existing processes and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            for port_info in "${unavailable_ports[@]}"; do
                local port=$(echo $port_info | cut -d':' -f2)
                log_info "Killing processes on port $port..."
                lsof -ti :$port | xargs kill -9 2>/dev/null || true
            done
        else
            log_error "Cannot start services with ports in use"
            exit 1
        fi
    fi
    
    log_success "Port availability check completed"
}

install_dependencies() {
    log_info "Installing dependencies for all services..."
    
    # Install shared dependencies first
    if [ ! -d "$PROJECT_ROOT/shared/node_modules" ]; then
        log_info "Installing shared dependencies..."
        cd "$PROJECT_ROOT/shared" || exit 1
        npm install || {
            log_error "Failed to install shared dependencies"
            exit 1
        }
    fi
    
    # Install dependencies for each service
    for service in "${!SERVICES[@]}"; do
        local service_dir="$SERVICES_DIR/$service"
        
        if [ -d "$service_dir" ] && [ -f "$service_dir/package.json" ]; then
            log_info "Installing dependencies for $service..."
            cd "$service_dir" || continue
            
            if [ ! -d "node_modules" ]; then
                npm install || {
                    log_error "Failed to install dependencies for $service"
                    exit 1
                }
            else
                log_info "Dependencies already installed for $service, skipping..."
            fi
        else
            log_warning "Service directory or package.json not found for $service"
        fi
    done
    
    cd "$PROJECT_ROOT"
    log_success "Dependencies installation completed"
}

build_services() {
    log_info "Building all services..."
    
    for service in "${!SERVICES[@]}"; do
        local service_dir="$SERVICES_DIR/$service"
        
        if [ -d "$service_dir" ] && [ -f "$service_dir/tsconfig.json" ]; then
            log_info "Building $service..."
            cd "$service_dir" || continue
            
            # Clean previous build
            rm -rf dist
            
            # Build TypeScript
            npm run build || {
                log_error "Failed to build $service"
                exit 1
            }
            
            log_success "$service built successfully"
        else
            log_warning "Service directory or tsconfig.json not found for $service"
        fi
    done
    
    cd "$PROJECT_ROOT"
    log_success "All services built successfully"
}

start_services_parallel() {
    log_info "Starting all services in parallel using PM2..."
    
    # Stop any existing PM2 processes
    pm2 stop ecosystem.config.js 2>/dev/null || true
    pm2 delete ecosystem.config.js 2>/dev/null || true
    
    # Start all services using ecosystem config
    pm2 start ecosystem.config.js --env $ENVIRONMENT
    
    # Save PM2 configuration
    pm2 save
    
    log_success "All services started in parallel"
}

start_services_sequential() {
    log_info "Starting services sequentially..."
    
    local service_order=("gateway" "user-management" "ai-assistant" "terminal" "workspace" "portfolio")
    
    for service in "${service_order[@]}"; do
        if [[ -n "${SERVICES[$service]}" ]]; then
            log_info "Starting $service on port ${SERVICES[$service]}..."
            
            pm2 start ecosystem.config.js --only $service --env $ENVIRONMENT
            
            # Wait for service to start
            sleep 3
            
            # Check if service is running
            if pm2 list | grep -q "$service.*online"; then
                log_success "$service started successfully"
            else
                log_error "$service failed to start"
                exit 1
            fi
        fi
    done
    
    pm2 save
    log_success "All services started sequentially"
}

start_services_selective() {
    if [ -z "$SELECTED_SERVICES" ]; then
        log_error "No services specified for selective mode"
        echo "Usage: $0 selective service1,service2,service3"
        echo "Available services: ${!SERVICES[*]}"
        exit 1
    fi
    
    log_info "Starting selected services: $SELECTED_SERVICES"
    
    IFS=',' read -ra SERVICE_ARRAY <<< "$SELECTED_SERVICES"
    
    for service in "${SERVICE_ARRAY[@]}"; do
        service=$(echo $service | xargs) # Trim whitespace
        
        if [[ -n "${SERVICES[$service]}" ]]; then
            log_info "Starting $service on port ${SERVICES[$service]}..."
            
            pm2 start ecosystem.config.js --only $service --env $ENVIRONMENT
            
            # Wait for service to start
            sleep 2
            
            if pm2 list | grep -q "$service.*online"; then
                log_success "$service started successfully"
            else
                log_error "$service failed to start"
                exit 1
            fi
        else
            log_error "Unknown service: $service"
            echo "Available services: ${!SERVICES[*]}"
            exit 1
        fi
    done
    
    pm2 save
    log_success "Selected services started successfully"
}

health_check() {
    log_info "Performing health checks..."
    
    sleep 5 # Give services time to start
    
    local failed_services=()
    
    for service in "${!SERVICES[@]}"; do
        local port="${SERVICES[$service]}"
        local url="http://localhost:$port/health"
        
        log_info "Checking $service health at $url..."
        
        if curl -s -f "$url" > /dev/null; then
            log_success "$service health check passed"
        else
            failed_services+=("$service")
            log_error "$service health check failed"
        fi
    done
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        log_error "Health checks failed for: ${failed_services[*]}"
        log_info "Check logs with: pm2 logs"
        exit 1
    fi
    
    log_success "All health checks passed"
}

show_status() {
    log_info "Service status:"
    pm2 list
    
    echo -e "\n${BLUE}Service URLs:${NC}"
    for service in "${!SERVICES[@]}"; do
        local port="${SERVICES[$service]}"
        echo -e "  ${service}: http://localhost:${port}"
        echo -e "    Health: http://localhost:${port}/health"
        echo -e "    Info: http://localhost:${port}/info"
    done
    
    echo -e "\n${BLUE}Useful commands:${NC}"
    echo -e "  pm2 logs           - View all logs"
    echo -e "  pm2 logs <service> - View service logs"
    echo -e "  pm2 monit          - Monitor all services"
    echo -e "  pm2 restart all    - Restart all services"
    echo -e "  ./scripts/stop-v3.sh - Stop all services"
}

main() {
    log_header
    check_prerequisites
    check_ports
    install_dependencies
    build_services
    
    case $STARTUP_MODE in
        "parallel")
            start_services_parallel
            ;;
        "sequential")
            start_services_sequential
            ;;
        "selective")
            start_services_selective
            ;;
        *)
            log_error "Invalid startup mode: $STARTUP_MODE"
            echo "Available modes: parallel, sequential, selective"
            exit 1
            ;;
    esac
    
    health_check
    show_status
    
    log_success "Stock Portfolio v3.0 microservices started successfully!"
}

# Handle script interruption
trap 'log_error "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"