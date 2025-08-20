#!/bin/bash
# Port configuration for shell scripts
# Source this file in your scripts: source /shared/config/ports.sh
# Generated on: 2025-08-19

# Frontend
export PORT_FRONTEND_MAIN=4100
export PORT_FRONTEND_DEV=""

# Gateway
export PORT_GATEWAY_MAIN=4110
export PORT_GATEWAY_ADMIN=""

# Services
export PORT_SERVICE_USER=4120
export PORT_SERVICE_AI=4130
export PORT_SERVICE_TERMINAL=4140
export PORT_SERVICE_WORKSPACE=4150
export PORT_SERVICE_PORTFOLIO=4160
export PORT_SERVICE_MARKET=4170
export PORT_SERVICE_ORCHESTRATION=4191

# WebSocket
export PORT_WS_SYSTEM=8001
export PORT_WS_CLAUDE=8002
export PORT_WS_TERMINAL=8003
export PORT_WS_PORTFOLIO=8004

# Database
export PORT_DB_POSTGRES=25060
export PORT_DB_PRISMA_STUDIO=5555
export PORT_DB_REDIS=6379

# Monitoring
export PORT_MONITORING_PROMETHEUS=9090
export PORT_MONITORING_GRAFANA=3001

# Service URLs (using localhost by default)
export FRONTEND_URL="http://localhost:${PORT_FRONTEND_MAIN}"
export GATEWAY_URL="http://localhost:${PORT_GATEWAY_MAIN}"
export USER_SERVICE_URL="http://localhost:${PORT_SERVICE_USER}"
export AI_SERVICE_URL="http://localhost:${PORT_SERVICE_AI}"
export TERMINAL_SERVICE_URL="http://localhost:${PORT_SERVICE_TERMINAL}"
export WORKSPACE_SERVICE_URL="http://localhost:${PORT_SERVICE_WORKSPACE}"
export PORTFOLIO_SERVICE_URL="http://localhost:${PORT_SERVICE_PORTFOLIO}"
export MARKET_SERVICE_URL="http://localhost:${PORT_SERVICE_MARKET}"
export ORCHESTRATION_SERVICE_URL="http://localhost:${PORT_SERVICE_ORCHESTRATION}"

# WebSocket URLs
export WS_SYSTEM_URL="ws://localhost:${PORT_WS_SYSTEM}"
export WS_CLAUDE_URL="ws://localhost:${PORT_WS_CLAUDE}"
export WS_TERMINAL_URL="ws://localhost:${PORT_WS_TERMINAL}"
export WS_PORTFOLIO_URL="ws://localhost:${PORT_WS_PORTFOLIO}"

# Helper functions

# Get service URL by service name
get_service_url() {
    local service=$1
    local host=${2:-localhost}
    local protocol=${3:-http}
    
    case "$service" in
        "user"|"userManagement")
            echo "${protocol}://${host}:${PORT_SERVICE_USER}"
            ;;
        "ai"|"aiAssistant")
            echo "${protocol}://${host}:${PORT_SERVICE_AI}"
            ;;
        "terminal")
            echo "${protocol}://${host}:${PORT_SERVICE_TERMINAL}"
            ;;
        "workspace")
            echo "${protocol}://${host}:${PORT_SERVICE_WORKSPACE}"
            ;;
        "portfolio")
            echo "${protocol}://${host}:${PORT_SERVICE_PORTFOLIO}"
            ;;
        "market"|"marketData")
            echo "${protocol}://${host}:${PORT_SERVICE_MARKET}"
            ;;
        "orchestration"|"aiOrchestration")
            echo "${protocol}://${host}:${PORT_SERVICE_ORCHESTRATION}"
            ;;
        *)
            echo "Error: Unknown service '$service'" >&2
            return 1
            ;;
    esac
}

# Get WebSocket URL by type
get_websocket_url() {
    local type=$1
    local host=${2:-localhost}
    local secure=${3:-false}
    local protocol="ws"
    
    if [ "$secure" = "true" ]; then
        protocol="wss"
    fi
    
    case "$type" in
        "system")
            echo "${protocol}://${host}:${PORT_WS_SYSTEM}"
            ;;
        "claude")
            echo "${protocol}://${host}:${PORT_WS_CLAUDE}"
            ;;
        "terminal")
            echo "${protocol}://${host}:${PORT_WS_TERMINAL}"
            ;;
        "portfolio")
            echo "${protocol}://${host}:${PORT_WS_PORTFOLIO}"
            ;;
        *)
            echo "Error: Unknown WebSocket type '$type'" >&2
            return 1
            ;;
    esac
}

# Get gateway API endpoint for a service
get_gateway_api_url() {
    local service=$1
    local host=${2:-localhost}
    local protocol=${3:-http}
    
    case "$service" in
        "user"|"userManagement")
            echo "${protocol}://${host}:${PORT_GATEWAY_MAIN}/api/v1/users"
            ;;
        "ai"|"aiAssistant")
            echo "${protocol}://${host}:${PORT_GATEWAY_MAIN}/api/v1/chat"
            ;;
        "terminal")
            echo "${protocol}://${host}:${PORT_GATEWAY_MAIN}/api/v1/terminal"
            ;;
        "workspace")
            echo "${protocol}://${host}:${PORT_GATEWAY_MAIN}/api/v1/workspace"
            ;;
        "portfolio")
            echo "${protocol}://${host}:${PORT_GATEWAY_MAIN}/api/v1/portfolios"
            ;;
        "market"|"marketData")
            echo "${protocol}://${host}:${PORT_GATEWAY_MAIN}/api/v1/market"
            ;;
        "orchestration"|"aiOrchestration")
            echo "${protocol}://${host}:${PORT_GATEWAY_MAIN}/api/v1/orchestration"
            ;;
        *)
            echo "Error: Unknown service '$service'" >&2
            return 1
            ;;
    esac
}

# Validate that all required ports are set
validate_ports() {
    local errors=0
    local required_vars=(
        "PORT_FRONTEND_MAIN"
        "PORT_GATEWAY_MAIN"
        "PORT_SERVICE_USER"
        "PORT_SERVICE_AI"
        "PORT_SERVICE_TERMINAL"
        "PORT_SERVICE_WORKSPACE"
        "PORT_SERVICE_PORTFOLIO"
        "PORT_SERVICE_MARKET"
        "PORT_SERVICE_ORCHESTRATION"
        "PORT_WS_SYSTEM"
        "PORT_WS_CLAUDE"
        "PORT_WS_TERMINAL"
        "PORT_WS_PORTFOLIO"
        "PORT_DB_POSTGRES"
        "PORT_DB_PRISMA_STUDIO"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "Error: Required port variable $var is not set" >&2
            ((errors++))
        fi
    done
    
    if [ $errors -eq 0 ]; then
        echo "All required ports are configured correctly"
        return 0
    else
        echo "Port validation failed with $errors errors" >&2
        return 1
    fi
}

# Check if a port is available (not in use)
check_port_available() {
    local port=$1
    
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "Port $port is already in use" >&2
            return 1
        else
            echo "Port $port is available"
            return 0
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tuln | grep -q ":$port "; then
            echo "Port $port is already in use" >&2
            return 1
        else
            echo "Port $port is available"
            return 0
        fi
    else
        echo "Warning: Cannot check port availability (lsof or netstat not found)" >&2
        return 2
    fi
}

# Check all configured ports for availability
check_all_ports() {
    echo "Checking port availability..."
    local all_available=true
    
    # Check frontend
    if ! check_port_available $PORT_FRONTEND_MAIN; then
        all_available=false
    fi
    
    # Check gateway
    if ! check_port_available $PORT_GATEWAY_MAIN; then
        all_available=false
    fi
    
    # Check services
    for port in $PORT_SERVICE_USER $PORT_SERVICE_AI $PORT_SERVICE_TERMINAL \
                $PORT_SERVICE_WORKSPACE $PORT_SERVICE_PORTFOLIO $PORT_SERVICE_MARKET \
                $PORT_SERVICE_ORCHESTRATION; do
        if ! check_port_available $port; then
            all_available=false
        fi
    done
    
    # Check WebSocket ports
    for port in $PORT_WS_SYSTEM $PORT_WS_CLAUDE $PORT_WS_TERMINAL $PORT_WS_PORTFOLIO; do
        if ! check_port_available $port; then
            all_available=false
        fi
    done
    
    if [ "$all_available" = true ]; then
        echo "All configured ports are available"
        return 0
    else
        echo "Some ports are already in use" >&2
        return 1
    fi
}

# Display current port configuration
show_port_config() {
    cat << EOF
=== Current Port Configuration ===

Frontend:
  Main: ${PORT_FRONTEND_MAIN}
  Dev Server: ${PORT_FRONTEND_DEV:-"Not configured"}

Gateway:
  Main: ${PORT_GATEWAY_MAIN}
  Admin: ${PORT_GATEWAY_ADMIN:-"Not configured"}

Services:
  User Management: ${PORT_SERVICE_USER}
  AI Assistant: ${PORT_SERVICE_AI}
  Terminal: ${PORT_SERVICE_TERMINAL}
  Workspace: ${PORT_SERVICE_WORKSPACE}
  Portfolio: ${PORT_SERVICE_PORTFOLIO}
  Market Data: ${PORT_SERVICE_MARKET}
  AI Orchestration: ${PORT_SERVICE_ORCHESTRATION}

WebSocket:
  System: ${PORT_WS_SYSTEM}
  Claude: ${PORT_WS_CLAUDE}
  Terminal: ${PORT_WS_TERMINAL}
  Portfolio: ${PORT_WS_PORTFOLIO}

Database:
  PostgreSQL: ${PORT_DB_POSTGRES}
  Prisma Studio: ${PORT_DB_PRISMA_STUDIO}
  Redis: ${PORT_DB_REDIS:-"Not configured"}

Monitoring:
  Prometheus: ${PORT_MONITORING_PROMETHEUS:-"Not configured"}
  Grafana: ${PORT_MONITORING_GRAFANA:-"Not configured"}

=================================
EOF
}

# Export utility functions for use in other scripts
export -f get_service_url
export -f get_websocket_url
export -f get_gateway_api_url
export -f validate_ports
export -f check_port_available
export -f check_all_ports
export -f show_port_config