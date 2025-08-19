#!/bin/bash

# ================================================================
# Stock Portfolio v3.0 Microservices - Stop Script
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
LOG_DIR="$PROJECT_ROOT/logs"

# Service definitions with ports
declare -A SERVICES=(
    ["gateway"]="4000"
    ["user-management"]="4100"
    ["ai-assistant"]="4200"
    ["terminal"]="4300"
    ["workspace"]="4400"
    ["portfolio"]="4500"
)

# Stop mode
STOP_MODE=${1:-graceful} # graceful, force, selective
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
    echo -e "\n${RED}========================================${NC}"
    echo -e "${RED} Stock Portfolio v3.0 - Stop Services${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "Mode: ${STOP_MODE}"
    echo -e "Project Root: ${PROJECT_ROOT}"
    echo -e "${RED}========================================${NC}\n"
}

show_current_status() {
    log_info "Current service status:"
    
    if command -v pm2 &> /dev/null; then
        pm2 list 2>/dev/null || log_warning "No PM2 processes found"
    else
        log_warning "PM2 not installed or not in PATH"
    fi
    
    echo -e "\nPort usage:"
    for service in "${!SERVICES[@]}"; do
        local port="${SERVICES[$service]}"
        if lsof -i :$port > /dev/null 2>&1; then
            local pid=$(lsof -ti :$port)
            local process_name=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
            echo -e "  Port $port: ${RED}OCCUPIED${NC} (PID: $pid, Process: $process_name)"
        else
            echo -e "  Port $port: ${GREEN}FREE${NC}"
        fi
    done
}

stop_pm2_services() {
    log_info "Stopping PM2 services..."
    
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 not found, skipping PM2 services"
        return 0
    fi
    
    # Check if ecosystem config exists
    if [ -f "$PROJECT_ROOT/ecosystem.config.js" ]; then
        log_info "Stopping services using ecosystem config..."
        
        case $STOP_MODE in
            "graceful")
                pm2 stop ecosystem.config.js 2>/dev/null || log_warning "Some services may not have been running"
                ;;
            "force")
                pm2 kill 2>/dev/null || log_warning "PM2 may not have been running"
                ;;
        esac
    else
        log_warning "Ecosystem config not found, stopping all PM2 processes..."
        pm2 stop all 2>/dev/null || log_warning "No PM2 processes to stop"
    fi
    
    # Optional: Delete processes (uncomment if you want to remove them completely)
    # pm2 delete ecosystem.config.js 2>/dev/null || true
    
    log_success "PM2 services stopped"
}

stop_selective_services() {
    if [ -z "$SELECTED_SERVICES" ]; then
        log_error "No services specified for selective mode"
        echo "Usage: $0 selective service1,service2,service3"
        echo "Available services: ${!SERVICES[*]}"
        exit 1
    fi
    
    log_info "Stopping selected services: $SELECTED_SERVICES"
    
    IFS=',' read -ra SERVICE_ARRAY <<< "$SELECTED_SERVICES"
    
    for service in "${SERVICE_ARRAY[@]}"; do
        service=$(echo $service | xargs) # Trim whitespace
        
        if [[ -n "${SERVICES[$service]}" ]]; then
            log_info "Stopping $service..."
            
            if command -v pm2 &> /dev/null; then
                pm2 stop "$service" 2>/dev/null || log_warning "$service may not have been running in PM2"
            fi
            
            # Also kill processes on the service port
            local port="${SERVICES[$service]}"
            if lsof -i :$port > /dev/null 2>&1; then
                log_info "Killing processes on port $port..."
                lsof -ti :$port | xargs kill -9 2>/dev/null || true
            fi
            
            log_success "$service stopped"
        else
            log_error "Unknown service: $service"
            echo "Available services: ${!SERVICES[*]}"
        fi
    done
}

force_kill_ports() {
    log_info "Force killing processes on service ports..."
    
    local killed_processes=()
    
    for service in "${!SERVICES[@]}"; do
        local port="${SERVICES[$service]}"
        
        if lsof -i :$port > /dev/null 2>&1; then
            log_info "Killing processes on port $port ($service)..."
            local pids=$(lsof -ti :$port)
            
            if [ -n "$pids" ]; then
                echo "$pids" | xargs kill -9 2>/dev/null || true
                killed_processes+=("$service:$port")
            fi
        fi
    done
    
    if [ ${#killed_processes[@]} -gt 0 ]; then
        log_success "Force killed processes for: ${killed_processes[*]}"
    else
        log_info "No processes found on service ports"
    fi
}

cleanup_resources() {
    log_info "Cleaning up resources..."
    
    # Clean up any temporary files
    if [ -d "$PROJECT_ROOT/tmp" ]; then
        log_info "Cleaning temporary files..."
        rm -rf "$PROJECT_ROOT/tmp"/* 2>/dev/null || true
    fi
    
    # Clean up logs older than 7 days (optional)
    if [ -d "$LOG_DIR" ]; then
        log_info "Cleaning old log files..."
        find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    fi
    
    # Clean up any orphaned socket files
    if [ -d "/tmp" ]; then
        find /tmp -name "socket.io-*" -user $(whoami) -delete 2>/dev/null || true
        find /tmp -name "pm2-*" -user $(whoami) -type d -empty -delete 2>/dev/null || true
    fi
    
    log_success "Resource cleanup completed"
}

verify_shutdown() {
    log_info "Verifying shutdown..."
    
    sleep 2 # Give processes time to shut down
    
    local still_running=()
    
    for service in "${!SERVICES[@]}"; do
        local port="${SERVICES[$service]}"
        
        if lsof -i :$port > /dev/null 2>&1; then
            still_running+=("$service:$port")
        fi
    done
    
    if [ ${#still_running[@]} -gt 0 ]; then
        log_warning "The following services may still be running: ${still_running[*]}"
        
        if [ "$STOP_MODE" != "force" ]; then
            read -p "Do you want to force kill remaining processes? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                force_kill_ports
            fi
        fi
    else
        log_success "All services stopped successfully"
    fi
}

show_final_status() {
    log_info "Final status check:"
    
    echo -e "\nPM2 Status:"
    if command -v pm2 &> /dev/null; then
        pm2 list 2>/dev/null || log_info "No PM2 processes running"
    else
        log_info "PM2 not available"
    fi
    
    echo -e "\nPort Status:"
    local any_running=false
    for service in "${!SERVICES[@]}"; do
        local port="${SERVICES[$service]}"
        if lsof -i :$port > /dev/null 2>&1; then
            echo -e "  Port $port ($service): ${RED}STILL OCCUPIED${NC}"
            any_running=true
        else
            echo -e "  Port $port ($service): ${GREEN}FREE${NC}"
        fi
    done
    
    if [ "$any_running" = false ]; then
        echo -e "\n${GREEN}✅ All Stock Portfolio v3.0 services stopped successfully!${NC}"
    else
        echo -e "\n${YELLOW}⚠️  Some processes may still be running. Use 'force' mode if needed.${NC}"
    fi
}

show_help() {
    echo -e "Usage: $0 [MODE] [SERVICES]"
    echo -e ""
    echo -e "Modes:"
    echo -e "  graceful   - Gracefully stop all services (default)"
    echo -e "  force      - Force kill all processes"
    echo -e "  selective  - Stop only selected services"
    echo -e ""
    echo -e "Examples:"
    echo -e "  $0                          # Graceful stop all services"
    echo -e "  $0 force                    # Force kill all services"
    echo -e "  $0 selective gateway,user-management  # Stop specific services"
    echo -e ""
    echo -e "Available services: ${!SERVICES[*]}"
}

main() {
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_help
        exit 0
    fi
    
    log_header
    show_current_status
    
    case $STOP_MODE in
        "graceful")
            stop_pm2_services
            ;;
        "force")
            stop_pm2_services
            force_kill_ports
            ;;
        "selective")
            stop_selective_services
            ;;
        *)
            log_error "Invalid stop mode: $STOP_MODE"
            show_help
            exit 1
            ;;
    esac
    
    cleanup_resources
    verify_shutdown
    show_final_status
}

# Handle script interruption
trap 'log_error "Stop script interrupted"; exit 1' INT TERM

# Run main function
main "$@"