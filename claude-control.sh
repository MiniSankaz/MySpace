#!/bin/bash

# Claude Background Service Control Script

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

CLAUDE_PIPE="/tmp/claude_assistant_pipe"
PID_FILE=".claude.pid"
LOG_FILE="logs/claude.log"

case "$1" in
    start)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if ps -p $PID > /dev/null; then
                echo -e "${YELLOW}Claude already running (PID: $PID)${NC}"
                exit 0
            fi
        fi
        
        echo -e "${BLUE}Starting Claude background service...${NC}"
        
        # Create logs directory
        mkdir -p logs
        
        # Create named pipe
        if [ ! -p "$CLAUDE_PIPE" ]; then
            mkfifo "$CLAUDE_PIPE"
        fi
        
        # Start Claude in background
        (claude --continue < "$CLAUDE_PIPE" 2>&1 | tee -a "$LOG_FILE") &
        PID=$!
        echo $PID > "$PID_FILE"
        
        # Keep pipe open
        exec 3>"$CLAUDE_PIPE"
        
        echo -e "${GREEN}✅ Claude started (PID: $PID)${NC}"
        echo "   Log file: $LOG_FILE"
        ;;
        
    stop)
        if [ ! -f "$PID_FILE" ]; then
            echo -e "${YELLOW}Claude not running${NC}"
            exit 0
        fi
        
        PID=$(cat "$PID_FILE")
        echo -e "${BLUE}Stopping Claude (PID: $PID)...${NC}"
        
        kill $PID 2>/dev/null
        rm -f "$PID_FILE"
        
        # Close pipe
        exec 3>&-
        rm -f "$CLAUDE_PIPE"
        
        echo -e "${GREEN}✅ Claude stopped${NC}"
        ;;
        
    status)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if ps -p $PID > /dev/null; then
                echo -e "${GREEN}✅ Claude is running (PID: $PID)${NC}"
                echo "   Log file: $LOG_FILE"
                echo "   Pipe: $CLAUDE_PIPE"
            else
                echo -e "${RED}❌ Claude process not found (stale PID file)${NC}"
                rm -f "$PID_FILE"
            fi
        else
            echo -e "${YELLOW}Claude is not running${NC}"
        fi
        ;;
        
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
        
    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -f "$LOG_FILE"
        else
            echo -e "${YELLOW}No log file found${NC}"
        fi
        ;;
        
    send)
        if [ ! -f "$PID_FILE" ]; then
            echo -e "${RED}Claude not running${NC}"
            exit 1
        fi
        
        if [ -z "$2" ]; then
            echo "Usage: $0 send \"message\""
            exit 1
        fi
        
        echo "$2" > "$CLAUDE_PIPE"
        echo -e "${GREEN}Message sent to Claude${NC}"
        ;;
        
    *)
        echo "Claude Background Service Control"
        echo ""
        echo "Usage: $0 {start|stop|status|restart|logs|send}"
        echo ""
        echo "Commands:"
        echo "  start    - Start Claude background service"
        echo "  stop     - Stop Claude background service"
        echo "  status   - Check if Claude is running"
        echo "  restart  - Restart Claude service"
        echo "  logs     - Tail Claude logs"
        echo "  send     - Send message to Claude"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 send \"Hello Claude\""
        echo "  $0 logs"
        ;;
esac