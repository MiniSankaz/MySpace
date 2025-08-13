#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
PORT=${PORT:-4000}
WS_PORT=${WS_PORT:-4001}
CLAUDE_WS_PORT=${CLAUDE_WS_PORT:-4002}
NODE_ENV=${NODE_ENV:-development}
LOG_FILE="./logs/server-$(date +%Y%m%d-%H%M%S).log"
PID_FILE="./server.pid"
MAX_RETRIES=3
RETRY_DELAY=5

# Terminal Storage Configuration
TERMINAL_STORAGE_MODE=${TERMINAL_STORAGE_MODE:-LOCAL}
TERMINAL_COMPATIBILITY_MODE=${TERMINAL_COMPATIBILITY_MODE:-hybrid}

# ASCII Art Banner
show_banner() {
    echo -e "${MAGENTA}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║       ██████╗  ██████╗ ██████╗ ████████╗                        ║"
    echo "║       ██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝                        ║"
    echo "║       ██████╔╝██║   ██║██████╔╝   ██║                           ║"
    echo "║       ██╔═══╝ ██║   ██║██╔══██╗   ██║                           ║"
    echo "║       ██║     ╚██████╔╝██║  ██║   ██║                           ║"
    echo "║       ╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝                           ║"
    echo "║                                                                   ║"
    echo "║              🚀 Enhanced Development Server v2.0 🚀               ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to display header
show_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         🚀 DF ERP System - Development Server 🚀          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to check system requirements
check_system() {
    echo -e "${CYAN}🔍 Checking system requirements...${NC}"
    
    # Check OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "${GREEN}✅ Operating System: macOS${NC}"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo -e "${GREEN}✅ Operating System: Linux${NC}"
    else
        echo -e "${YELLOW}⚠️  Operating System: $OSTYPE (may have compatibility issues)${NC}"
    fi
    
    # Check Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
        
        # Check if Node version is >= 18
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
        if [ $NODE_MAJOR -lt 18 ]; then
            echo -e "${YELLOW}⚠️  Node.js version should be >= 18.0.0${NC}"
        fi
    else
        echo -e "${RED}❌ Node.js is not installed!${NC}"
        exit 1
    fi
    
    # Check npm version
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        echo -e "${GREEN}✅ npm: v$NPM_VERSION${NC}"
    else
        echo -e "${RED}❌ npm is not installed!${NC}"
        exit 1
    fi
}

# Function to check environment variables
check_environment() {
    echo -e "${CYAN}🔐 Checking environment variables...${NC}"
    
    local env_count=0
    local critical_vars_missing=()
    
    # Check for .env files
    if [ -f ".env" ]; then
        echo -e "${GREEN}✅ Found .env file${NC}"
        ((env_count++))
    fi
    
    if [ -f ".env.local" ]; then
        echo -e "${GREEN}✅ Found .env.local file${NC}"
        ((env_count++))
    fi
    
    if [ -f ".env.development" ]; then
        echo -e "${GREEN}✅ Found .env.development file${NC}"
        ((env_count++))
    fi
    
    if [ -f ".env.production" ]; then
        echo -e "${GREEN}✅ Found .env.production file${NC}"
        ((env_count++))
    fi
    
    if [ $env_count -eq 0 ]; then
        echo -e "${YELLOW}⚠️  No .env files found${NC}"
        echo -e "${YELLOW}   Creating .env.local from template...${NC}"
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            echo -e "${GREEN}✅ Created .env.local from .env.example${NC}"
        fi
    fi
    
    # Load environment variables
    if [ -z "$DATABASE_URL" ] && [ -f ".env" ]; then
        source .env 2>/dev/null
    fi
    
    if [ -z "$DATABASE_URL" ] && [ -f ".env.local" ]; then
        source .env.local 2>/dev/null
    fi
    
    # Check critical variables
    [ -z "$DATABASE_URL" ] && critical_vars_missing+=("DATABASE_URL")
    [ -z "$NEXTAUTH_SECRET" ] && critical_vars_missing+=("NEXTAUTH_SECRET")
    [ -z "$NEXTAUTH_URL" ] && critical_vars_missing+=("NEXTAUTH_URL")
    
    if [ ${#critical_vars_missing[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Missing critical environment variables:${NC}"
        for var in "${critical_vars_missing[@]}"; do
            echo -e "${YELLOW}   - $var${NC}"
        done
    else
        echo -e "${GREEN}✅ All critical environment variables set${NC}"
    fi
}

# Function to check dependencies
check_dependencies() {
    echo -e "${CYAN}📋 Checking dependencies...${NC}"
    
    # Check Claude CLI
    if command -v claude &> /dev/null; then
        CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✅ Claude Code CLI found${NC}"
    else
        echo -e "${YELLOW}⚠️  Claude Code CLI not found${NC}"
        echo -e "${YELLOW}   Claude terminal will not work${NC}"
        echo -e "${YELLOW}   Install from: https://claude.ai/download${NC}"
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        echo -e "${GREEN}✅ Git: v$GIT_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  Git not found${NC}"
    fi
    
    # Check TypeScript
    if command -v tsc &> /dev/null; then
        TSC_VERSION=$(tsc --version | cut -d' ' -f2)
        echo -e "${GREEN}✅ TypeScript: v$TSC_VERSION${NC}"
    elif [ -f "node_modules/.bin/tsc" ]; then
        TSC_VERSION=$(node_modules/.bin/tsc --version | cut -d' ' -f2)
        echo -e "${GREEN}✅ TypeScript (local): v$TSC_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  TypeScript not found${NC}"
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        npm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to install dependencies${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Dependencies installed${NC}"
    fi
    
    # Check for outdated packages
    echo -e "${CYAN}📊 Checking for outdated packages...${NC}"
    OUTDATED=$(npm outdated --json 2>/dev/null | jq -r 'keys | length' 2>/dev/null || echo "0")
    if [ "$OUTDATED" != "0" ] && [ "$OUTDATED" != "" ]; then
        echo -e "${YELLOW}⚠️  $OUTDATED packages are outdated${NC}"
        echo -e "${YELLOW}   Run 'npm update' to update them${NC}"
    else
        echo -e "${GREEN}✅ All packages are up to date${NC}"
    fi
    
    # Check Prisma
    if [ ! -d "node_modules/.prisma" ]; then
        echo -e "${YELLOW}🗄️ Generating Prisma client...${NC}"
        npx prisma generate
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to generate Prisma client${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Prisma client ready${NC}"
    fi
}

# Function to check and kill ports
check_ports() {
    echo -e "${CYAN}🔌 Checking ports...${NC}"
    
    local ports=("$PORT" "$WS_PORT" "$CLAUDE_WS_PORT")
    local port_names=("Main" "Terminal WebSocket" "Claude Terminal")
    
    for i in "${!ports[@]}"; do
        local port="${ports[$i]}"
        local name="${port_names[$i]}"
        
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  ${name} port $port is already in use!${NC}"
            echo -e "${YELLOW}   Killing existing process...${NC}"
            
            # Try different methods to kill the port
            if command -v npx &> /dev/null; then
                npx kill-port $port 2>/dev/null
            else
                kill $(lsof -Pi :$port -sTCP:LISTEN -t) 2>/dev/null
            fi
            
            sleep 1
            
            # Check if port is free now
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo -e "${RED}❌ Failed to free port $port${NC}"
                echo -e "${RED}   Please manually kill the process using port $port${NC}"
                exit 1
            fi
        fi
        echo -e "${GREEN}✅ ${name} port $port is available${NC}"
    done
}

# Function to check database
check_database() {
    echo -e "${CYAN}🗄️ Checking database...${NC}"
    
    # Check database type from DATABASE_URL
    if [ ! -z "$DATABASE_URL" ]; then
        if [[ "$DATABASE_URL" == sqlite* ]]; then
            # SQLite database
            DB_FILE=$(echo $DATABASE_URL | sed 's/^.*file://')
            if [ -f "$DB_FILE" ] || [ -f "prisma/dev.db" ]; then
                echo -e "${GREEN}✅ SQLite database found${NC}"
                # Check database size
                if [ -f "prisma/dev.db" ]; then
                    DB_SIZE=$(du -h prisma/dev.db | cut -f1)
                    echo -e "${GREEN}   Database size: $DB_SIZE${NC}"
                fi
            else
                echo -e "${YELLOW}📦 Creating new SQLite database...${NC}"
                npx prisma db push 2>/dev/null
            fi
        elif [[ "$DATABASE_URL" == postgres* ]] || [[ "$DATABASE_URL" == mysql* ]]; then
            # PostgreSQL or MySQL
            echo -e "${GREEN}✅ Using external database${NC}"
            # Test connection
            npx prisma db execute --stdin <<< "SELECT 1" 2>/dev/null
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Database connection successful${NC}"
            else
                echo -e "${RED}❌ Database connection failed${NC}"
                echo -e "${YELLOW}   Check your DATABASE_URL in .env${NC}"
                return 1
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  DATABASE_URL not set, using default SQLite${NC}"
        if [ ! -f "prisma/dev.db" ]; then
            echo -e "${YELLOW}📦 Creating new database...${NC}"
            npx prisma db push 2>/dev/null
        fi
    fi
    
    # Run migrations if needed
    echo -e "${CYAN}🔄 Checking database migrations...${NC}"
    npx prisma migrate deploy 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database migrations applied${NC}"
    else
        echo -e "${YELLOW}⚠️  No pending migrations or using db push${NC}"
    fi
}

# Function to setup logging
setup_logging() {
    # Create logs directory if it doesn't exist
    if [ ! -d "logs" ]; then
        mkdir -p logs
        echo -e "${GREEN}✅ Created logs directory${NC}"
    fi
    
    # Rotate old logs if too many
    LOG_COUNT=$(ls -1 logs/server-*.log 2>/dev/null | wc -l)
    if [ $LOG_COUNT -gt 10 ]; then
        echo -e "${YELLOW}📂 Rotating old logs...${NC}"
        ls -1t logs/server-*.log | tail -n +11 | xargs rm -f
        echo -e "${GREEN}✅ Old logs cleaned${NC}"
    fi
    
    # Create new log file
    touch "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server starting..." >> "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Environment: $NODE_ENV" >> "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ports: Main=$PORT, Terminal=$WS_PORT, Claude=$CLAUDE_WS_PORT" >> "$LOG_FILE"
    
    echo -e "${GREEN}✅ Logging to: $LOG_FILE${NC}"
}

# Function to check build
check_build() {
    echo -e "${CYAN}🔨 Checking build status...${NC}"
    
    local need_rebuild=false
    
    # Always rebuild terminal-memory service
    echo -e "${CYAN}🔧 Building terminal-memory service...${NC}"
    
    # Create dist/services directory if it doesn't exist
    if [ ! -d "dist/services" ]; then
        mkdir -p dist/services
        echo -e "${GREEN}✅ Created dist/services directory${NC}"
    fi
    
    # Compile terminal-memory.service.ts to JavaScript
    if [ -f "src/services/terminal-memory.service.ts" ]; then
        # Check if TypeScript compiler is available
        if command -v tsc &> /dev/null || [ -f "node_modules/.bin/tsc" ]; then
            # Use local tsc if available, otherwise global
            TSC_CMD="tsc"
            if [ -f "node_modules/.bin/tsc" ]; then
                TSC_CMD="node_modules/.bin/tsc"
            fi
            
            # Compile the TypeScript file
            $TSC_CMD src/services/terminal-memory.service.ts \
                --outDir dist \
                --module commonjs \
                --target es2018 \
                --esModuleInterop \
                --skipLibCheck \
                --allowJs \
                --resolveJsonModule \
                --downlevelIteration \
                --moduleResolution node \
                --noEmit false \
                --declaration false 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Terminal-memory service compiled successfully${NC}"
            else
                # If TypeScript compilation fails, try simpler approach
                echo -e "${YELLOW}⚠️  TypeScript compilation had issues, using fallback...${NC}"
                
                # Copy the compiled file if it exists
                if [ -f "src/services/terminal-memory.service.js.compiled" ]; then
                    cp src/services/terminal-memory.service.js.compiled dist/services/terminal-memory.service.js
                    echo -e "${GREEN}✅ Used pre-compiled terminal-memory service${NC}"
                fi
            fi
        else
            # No TypeScript compiler, use pre-compiled version if available
            if [ -f "src/services/terminal-memory.service.js.compiled" ]; then
                cp src/services/terminal-memory.service.js.compiled dist/services/terminal-memory.service.js
                echo -e "${GREEN}✅ Used pre-compiled terminal-memory service${NC}"
            else
                echo -e "${YELLOW}⚠️  Terminal-memory service not compiled (optional)${NC}"
            fi
        fi
    fi
    
    # Check if .next exists for Next.js
    if [ ! -d ".next" ]; then
        echo -e "${YELLOW}📦 Next.js not built${NC}"
        need_rebuild=true
    fi
    
    # Check if source files changed (simple check)
    if [ -d ".next" ]; then
        # Find if any source file is newer than .next directory
        if [ -n "$(find src -type f -name '*.tsx' -o -name '*.ts' -newer .next 2>/dev/null | head -1)" ]; then
            echo -e "${YELLOW}📦 Source files changed${NC}"
            need_rebuild=true
        fi
    fi
    
    if [ "$need_rebuild" = true ]; then
        if [ "$NODE_ENV" = "production" ]; then
            echo -e "${CYAN}🔨 Building for production...${NC}"
            npm run build
            if [ $? -ne 0 ]; then
                echo -e "${RED}❌ Build failed${NC}"
                exit 1
            fi
        else
            echo -e "${GREEN}✅ Development mode - no build required${NC}"
        fi
    else
        echo -e "${GREEN}✅ Build is up to date${NC}"
    fi
}

# Function to get network info
get_network_info() {
    local ip_local="127.0.0.1"
    local ip_network=""
    
    # Try to get network IP
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ip_network=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
    else
        # Linux
        ip_network=$(hostname -I | awk '{print $1}' 2>/dev/null)
    fi
    
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    🌐 Access Points 🌐                     ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    printf "${BLUE}║${NC} ${GREEN}%-12s${NC} http://127.0.0.1:%-35s ${BLUE}║${NC}\n" "Local:" "$PORT"
    if [ ! -z "$ip_network" ]; then
        printf "${BLUE}║${NC} ${GREEN}%-12s${NC} http://%-44s ${BLUE}║${NC}\n" "Network:" "$ip_network:$PORT"
    fi
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║                    📱 Applications 📱                      ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    printf "${BLUE}║${NC} ${CYAN}%-14s${NC} http://127.0.0.1:%-31s ${BLUE}║${NC}\n" "Dashboard:" "$PORT/dashboard"
    printf "${BLUE}║${NC} ${CYAN}%-14s${NC} http://127.0.0.1:%-31s ${BLUE}║${NC}\n" "Assistant:" "$PORT/assistant"
    printf "${BLUE}║${NC} ${CYAN}%-14s${NC} http://127.0.0.1:%-31s ${BLUE}║${NC}\n" "Workspace:" "$PORT/workspace"
    printf "${BLUE}║${NC} ${CYAN}%-14s${NC} http://127.0.0.1:%-31s ${BLUE}║${NC}\n" "Login:" "$PORT/login"
    printf "${BLUE}║${NC} ${CYAN}%-14s${NC} http://127.0.0.1:%-31s ${BLUE}║${NC}\n" "Register:" "$PORT/register"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║                  🔌 WebSocket Services 🔌                  ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    printf "${BLUE}║${NC} ${MAGENTA}%-16s${NC} ws://127.0.0.1:%-29s ${BLUE}║${NC}\n" "Terminal WS:" "$WS_PORT"
    printf "${BLUE}║${NC} ${MAGENTA}%-16s${NC} ws://127.0.0.1:%-29s ${BLUE}║${NC}\n" "Claude Term:" "$CLAUDE_WS_PORT"
    printf "${BLUE}║${NC} ${MAGENTA}%-16s${NC} ws://127.0.0.1:%-29s ${BLUE}║${NC}\n" "Claude Chat:" "$PORT/ws/claude"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to show status
show_status() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    📊 Server Status 📊                     ║${NC}"
    echo -e "${CYAN}╠════════════════════════════════════════════════════════════╣${NC}"
    printf "${CYAN}║${NC} ${WHITE}%-16s${NC} %-41s ${CYAN}║${NC}\n" "Environment:" "$NODE_ENV"
    printf "${CYAN}║${NC} ${WHITE}%-16s${NC} %-41s ${CYAN}║${NC}\n" "Main Port:" "$PORT"
    printf "${CYAN}║${NC} ${WHITE}%-16s${NC} %-41s ${CYAN}║${NC}\n" "Terminal Port:" "$WS_PORT"
    printf "${CYAN}║${NC} ${WHITE}%-16s${NC} %-41s ${CYAN}║${NC}\n" "Claude Port:" "$CLAUDE_WS_PORT"
    printf "${CYAN}║${NC} ${WHITE}%-16s${NC} %-41s ${CYAN}║${NC}\n" "Hot Reload:" "$([ "$NODE_ENV" = "development" ] && echo "Enabled ♻️" || echo "Disabled")"
    printf "${CYAN}║${NC} ${WHITE}%-16s${NC} %-41s ${CYAN}║${NC}\n" "Log File:" "$(basename $LOG_FILE)"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to monitor server health
monitor_server() {
    local pid=$1
    local start_time=$(date +%s)
    local check_interval=30  # Check every 30 seconds
    
    while kill -0 $pid 2>/dev/null; do
        sleep $check_interval
        
        # Calculate uptime
        local current_time=$(date +%s)
        local uptime=$((current_time - start_time))
        local hours=$((uptime / 3600))
        local minutes=$(((uptime % 3600) / 60))
        local seconds=$((uptime % 60))
        
        # Check port availability
        local ports_healthy=true
        for port in $PORT $WS_PORT $CLAUDE_WS_PORT; do
            if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                ports_healthy=false
                echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Port $port is not listening" >> "$LOG_FILE"
            fi
        done
        
        # Log health status
        if [ "$ports_healthy" = true ]; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Health check: OK (Uptime: ${hours}h ${minutes}m ${seconds}s)" >> "$LOG_FILE"
        fi
    done
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server process ended" >> "$LOG_FILE"
}

# Function to start server
start_server() {
    local mode=$1
    
    show_status
    get_network_info
    
    echo -e "${YELLOW}🚀 Starting server...${NC}"
    echo -e "${YELLOW}📝 Logs: tail -f $LOG_FILE${NC}"
    echo -e "${YELLOW}🛑 Press Ctrl+C to stop${NC}"
    echo ""
    
    # Start server in background to monitor it (with 8GB memory limit)
    case $mode in
        "production")
            NODE_ENV=production NODE_OPTIONS="--max-old-space-size=8192" npm run start 2>&1 | tee -a "$LOG_FILE" &
            ;;
        "development")
            NODE_OPTIONS="--max-old-space-size=8192" npm run dev 2>&1 | tee -a "$LOG_FILE" &
            ;;
        "custom")
            NODE_OPTIONS="--max-old-space-size=8192" node server.js 2>&1 | tee -a "$LOG_FILE" &
            ;;
        *)
            NODE_OPTIONS="--max-old-space-size=8192" npm run dev 2>&1 | tee -a "$LOG_FILE" &
            ;;
    esac
    
    local server_pid=$!
    
    # Save PID and start time
    echo $server_pid > "$PID_FILE"
    date +%s > "$PID_FILE.start"
    
    # Wait for server to start (with timeout)
    local max_wait=30
    local waited=0
    echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
    
    while [ $waited -lt $max_wait ]; do
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Server started successfully!${NC}"
            break
        fi
        sleep 1
        ((waited++))
        printf "."
    done
    echo ""
    
    if [ $waited -ge $max_wait ]; then
        echo -e "${RED}❌ Server failed to start within ${max_wait} seconds${NC}"
        cleanup
    fi
    
    # Start health monitoring in background
    monitor_server $server_pid &
    local monitor_pid=$!
    
    # Wait for server process
    wait $server_pid
    local exit_code=$?
    
    # Kill monitor if still running
    kill $monitor_pid 2>/dev/null
    
    # Handle unexpected exit
    if [ $exit_code -ne 0 ] && [ $exit_code -ne 130 ]; then
        echo -e "${RED}❌ Server exited unexpectedly with code $exit_code${NC}"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server crashed with exit code $exit_code" >> "$LOG_FILE"
        
        # Auto-restart logic
        if [ "$AUTO_RESTART" = "true" ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            ((RETRY_COUNT++))
            echo -e "${YELLOW}🔄 Attempting restart ($RETRY_COUNT/$MAX_RETRIES)...${NC}"
            sleep $RETRY_DELAY
            start_server "$mode"
        fi
    fi
}

# Function to handle shutdown
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down server...${NC}"
    
    # Save shutdown time to log
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server shutdown initiated" >> "$LOG_FILE"
    
    # Kill all related processes
    echo -e "${YELLOW}   Stopping Node processes...${NC}"
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            kill -TERM $PID
            sleep 2
            if kill -0 $PID 2>/dev/null; then
                kill -9 $PID 2>/dev/null
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    pkill -f "next dev" 2>/dev/null
    pkill -f "node server.js" 2>/dev/null
    pkill -f "npm run" 2>/dev/null
    
    # Kill ports
    echo -e "${YELLOW}   Freeing ports...${NC}"
    for port in $PORT $WS_PORT $CLAUDE_WS_PORT; do
        lsof -ti:$port | xargs kill -9 2>/dev/null
    done
    
    # Final log entry
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server shutdown complete" >> "$LOG_FILE"
    
    echo -e "${GREEN}✅ Shutdown complete${NC}"
    echo -e "${CYAN}📝 Logs saved to: $LOG_FILE${NC}"
    
    # Show uptime if available
    if [ -f "$PID_FILE.start" ]; then
        START_TIME=$(cat "$PID_FILE.start")
        END_TIME=$(date +%s)
        UPTIME=$((END_TIME - START_TIME))
        HOURS=$((UPTIME / 3600))
        MINUTES=$(((UPTIME % 3600) / 60))
        echo -e "${CYAN}⏱️  Total uptime: ${HOURS}h ${MINUTES}m${NC}"
        rm -f "$PID_FILE.start"
    fi
    
    exit 0
}

# Set trap for clean shutdown
trap cleanup INT TERM EXIT

# Global variables for auto-restart
RETRY_COUNT=0
AUTO_RESTART=${AUTO_RESTART:-false}

# Function to check for updates
check_updates() {
    echo -e "${CYAN}🔄 Checking for updates...${NC}"
    
    if [ -d ".git" ] && command -v git &> /dev/null; then
        # Check if we're behind remote
        git fetch --quiet 2>/dev/null
        LOCAL=$(git rev-parse HEAD 2>/dev/null)
        REMOTE=$(git rev-parse @{u} 2>/dev/null)
        
        if [ "$LOCAL" != "$REMOTE" ] && [ ! -z "$REMOTE" ]; then
            echo -e "${YELLOW}⚠️  Updates available on remote repository${NC}"
            echo -e "${YELLOW}   Run 'git pull' to update${NC}"
        else
            echo -e "${GREEN}✅ Repository is up to date${NC}"
        fi
    fi
}

# Main execution
main() {
    clear
    show_banner
    show_header
    
    # Check if already running
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if kill -0 $OLD_PID 2>/dev/null; then
            echo -e "${RED}❌ Server is already running (PID: $OLD_PID)${NC}"
            echo -e "${YELLOW}   Stop it first with: kill $OLD_PID${NC}"
            echo -e "${YELLOW}   Or use: ./start.sh --status${NC}"
            exit 1
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    # Run all checks
    check_system
    check_environment
    check_dependencies
    check_ports
    check_database
    check_build
    check_updates
    setup_logging
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ All checks passed! Ready to start.${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Check for command line arguments
    case "$1" in
        "--production"|"-p")
            NODE_ENV=production
            start_server "production"
            ;;
        "--development"|"-d")
            NODE_ENV=development
            start_server "development"
            ;;
        "--custom"|"-c")
            start_server "custom"
            ;;
        "--status"|"-s")
            echo -e "${CYAN}🔍 Checking server status...${NC}"
            echo ""
            for port in $PORT $WS_PORT $CLAUDE_WS_PORT; do
                if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                    PID=$(lsof -Pi :$port -sTCP:LISTEN -t | head -1)
                    echo -e "${GREEN}✅ Port $port is active (PID: $PID)${NC}"
                else
                    echo -e "${RED}❌ Port $port is not active${NC}"
                fi
            done
            
            if [ -f "$LOG_FILE" ]; then
                echo ""
                echo -e "${CYAN}📝 Latest log entries:${NC}"
                tail -n 5 "$LOG_FILE"
            fi
            exit 0
            ;;
        "--logs"|"-l")
            if [ -f "$LOG_FILE" ]; then
                echo -e "${CYAN}📝 Showing logs from: $LOG_FILE${NC}"
                tail -f "$LOG_FILE"
            else
                echo -e "${RED}❌ No log file found${NC}"
            fi
            exit 0
            ;;
        "--clean")
            echo -e "${YELLOW}🧹 Cleaning build and cache...${NC}"
            rm -rf .next node_modules/.cache
            echo -e "${GREEN}✅ Build and cache cleaned${NC}"
            echo -e "${YELLOW}📦 Reinstalling dependencies...${NC}"
            npm install
            echo -e "${GREEN}✅ Clean complete${NC}"
            exit 0
            ;;
        "--help"|"-h")
            echo "Usage: ./start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --production, -p   Start in production mode"
            echo "  --development, -d  Start in development mode (default)"
            echo "  --custom, -c       Start with custom server.js"
            echo "  --help, -h         Show this help message"
            echo "  --status, -s       Check server status"
            echo "  --logs, -l         Show recent logs"
            echo "  --clean            Clean build and cache"
            echo ""
            echo "Environment Variables:"
            echo "  PORT              Main server port (default: 4000)"
            echo "  WS_PORT           Terminal WebSocket port (default: 4001)"
            echo "  CLAUDE_WS_PORT    Claude Terminal port (default: 4002)"
            echo "  NODE_ENV          Environment (development/production)"
            echo ""
            echo "Examples:"
            echo "  ./start.sh                  # Start in development mode"
            echo "  ./start.sh --production     # Start in production mode"
            echo "  ./start.sh --status         # Check if server is running"
            echo "  PORT=3000 ./start.sh        # Start on port 3000"
            echo ""
            exit 0
            ;;
        *)
            # Default to development mode
            NODE_ENV=development
            start_server "development"
            ;;
    esac
}

# Run main function
main "$@"

# Keep script running
wait