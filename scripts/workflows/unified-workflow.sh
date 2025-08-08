#!/bin/bash

# Unified Workflow Script - Integrates _library, _logs, _sop
# Usage: ./scripts/unified-workflow.sh [command] [options]

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Directories
LIBRARY_DIR="_library"
LOGS_DIR="_logs"
SOP_DIR="_sop"
ACTIVE_SOP_DIR="docs/SOPs"

# Ensure log directories exist
mkdir -p "$LOGS_DIR"/{fixes,errors,performance,security,reports,tests,build,library,sop-compliance}
mkdir -p "$LOGS_DIR/reports"/{daily,weekly,monthly}

# Show help
show_help() {
    cat << EOF
${PURPLE}=== Unified Workflow System with AI-Driven Analysis ===${NC}

${YELLOW}Usage:${NC}
  $0 [command] [options]

${YELLOW}Core Commands:${NC}
  ${GREEN}check${NC}         - Check system status
  ${GREEN}fix${NC}           - Start isolated fix with library check
  ${GREEN}ai-analyze${NC}    - AI-driven problem analysis workflow
  ${GREEN}component${NC}     - Create/find reusable component
  ${GREEN}log${NC}           - View/search logs
  ${GREEN}sop${NC}           - Find/apply SOP
  ${GREEN}sync${NC}          - Sync all systems
  ${GREEN}report${NC}        - Generate status report
  ${GREEN}library${NC}       - Manage library components

${YELLOW}AI-Driven Workflow:${NC}
  $0 ai-analyze "problem description"           # Full AI analysis
  $0 ai-analyze "problem description" true      # Interactive mode with PMO decisions
  $0 fix "problem" --ai                         # Fix with AI analysis

${YELLOW}Traditional Examples:${NC}
  $0 check                    # Check all systems
  $0 fix contact-page         # Start fix with library support
  $0 component find Button    # Find Button component
  $0 component create Button  # Create new component
  $0 log search "api error"   # Search logs
  $0 log recent              # Show recent logs
  $0 sop find "security"      # Find security SOPs
  $0 sop apply API-SECURITY   # Apply SOP to code
  $0 library index           # Update library index

${YELLOW}AI Flow Examples:${NC}
  $0 ai-analyze "page builder errors"           # Analyze page builder issues
  $0 ai-analyze "security vulnerabilities" true # Interactive security analysis
  $0 fix "websocket connection errors" --ai     # AI-powered fix

${PURPLE}Complete AI Analysis Flow:${NC}
  1. Problem/Requirement → Claude/AI Analyst
  2. SOP Understanding  
  3. Design solving problem plan/Design action plan Follow SOP
  4. Code Check in project
  5. IF(non Conflict) Fix/Do Else(Conflict){Ask PMO for decision then bring decision to first step}
  6. Find Reuse Library IF(Reuseable){ use it }Else{Create new one with Claude/AI follow Design solving problem plan/Design action plan IF(Find New Better SOP Break The Ask PMO for update SOP Then Update SOP and bring issue back to first step)}
  7. Analysis impact
  8. Follow config/Edit/Update all files/logics related of Problem/Requirement
  9. Log
  10. Commit
  ${YELLOW}10.5. Fine-tune Library (NEW)${NC} - Extract patterns & update reusable components
  11. Fetch IF(Conflict) back to push step4 Else(non-Conflict) noting → Push

EOF
}

# Log function
log_action() {
    local category=$1
    local action=$2
    local details=$3
    local log_file="$LOGS_DIR/$category/$(date +%Y-%m-%d).log"
    
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"action\":\"$action\",\"details\":\"$details\"}" >> "$log_file"
}

# Check system status
check_status() {
    echo -e "${PURPLE}=== System Status Check ===${NC}\n"
    
    # Check directories
    echo -e "${BLUE}1. Directory Status:${NC}"
    for dir in "$LIBRARY_DIR" "$LOGS_DIR" "$SOP_DIR" "$ACTIVE_SOP_DIR"; do
        if [ -d "$dir" ]; then
            count=$(find "$dir" -type f 2>/dev/null | wc -l)
            echo -e "  ${GREEN}✓${NC} $dir (${count} files)"
        else
            echo -e "  ${RED}✗${NC} $dir (missing)"
        fi
    done
    
    # Check recent logs
    echo -e "\n${BLUE}2. Recent Activity (Last 24h):${NC}"
    if [ -d "$LOGS_DIR" ]; then
        recent_fixes=$(find "$LOGS_DIR/fixes" -type f -name "*.log" -mtime -1 2>/dev/null | wc -l)
        recent_errors=$(find "$LOGS_DIR/errors" -type f -name "*.log" -mtime -1 2>/dev/null | wc -l)
        echo -e "  🔧 Fixes: $recent_fixes"
        echo -e "  ❌ Errors: $recent_errors"
    fi
    
    # Check active SOPs
    echo -e "\n${BLUE}3. Active SOPs:${NC}"
    if [ -d "$ACTIVE_SOP_DIR" ]; then
        sop_count=$(ls -1 "$ACTIVE_SOP_DIR"/SOP-*.md 2>/dev/null | wc -l)
        echo -e "  📋 Total: $sop_count SOPs"
        ls -1 "$ACTIVE_SOP_DIR"/SOP-*.md 2>/dev/null | tail -5 | while read -r sop; do
            echo -e "  - $(basename "$sop" .md)"
        done
    fi
    
    # Check library usage
    echo -e "\n${BLUE}4. Library Statistics:${NC}"
    if [ -d "$LIBRARY_DIR" ]; then
        component_count=$(find "$LIBRARY_DIR/components" -name "*.tsx" -o -name "*.ts" 2>/dev/null | wc -l)
        hook_count=$(find "$LIBRARY_DIR/hooks" -name "*.ts" 2>/dev/null | wc -l)
        util_count=$(find "$LIBRARY_DIR/utils" -name "*.ts" 2>/dev/null | wc -l)
        echo -e "  📦 Components: $component_count"
        echo -e "  🪝 Hooks: $hook_count"
        echo -e "  🔧 Utils: $util_count"
    fi
    
    # Check compliance
    echo -e "\n${BLUE}5. SOP Compliance Check:${NC}"
    if [ -d "$SOP_DIR/current" ]; then
        linked=$(ls -1 "$SOP_DIR/current" 2>/dev/null | wc -l)
        echo -e "  🔗 Linked SOPs: $linked"
    fi
    if [ -d "$ACTIVE_SOP_DIR" ]; then
        active=$(ls -1 "$ACTIVE_SOP_DIR" 2>/dev/null | wc -l)
        echo -e "  📋 Active SOPs: $active"
    fi
    
    # Count all SOPs in _sop directory
    if [ -d "$SOP_DIR" ]; then
        core_sops=$(find "$SOP_DIR/core" -name "*.md" 2>/dev/null | wc -l)
        dev_sops=$(find "$SOP_DIR/development" -name "*.md" 2>/dev/null | wc -l)
        doc_sops=$(find "$SOP_DIR/documentation" -name "*.md" 2>/dev/null | wc -l)
        module_sops=$(find "$SOP_DIR/modules" -name "*.md" 2>/dev/null | wc -l)
        test_sops=$(find "$SOP_DIR/testing" -name "*.md" 2>/dev/null | wc -l)
        security_sops=$(find "$SOP_DIR/security" -name "*.md" 2>/dev/null | wc -l)
        analysis_sops=$(find "$SOP_DIR/co-analysis" -name "*.md" 2>/dev/null | wc -l)
        
        total_library_sops=$((core_sops + dev_sops + doc_sops + module_sops + test_sops + security_sops + analysis_sops))
        
        echo -e "  📚 SOP Library: $total_library_sops total"
        echo -e "    ├─ Core: $core_sops"
        echo -e "    ├─ Development: $dev_sops" 
        echo -e "    ├─ Documentation: $doc_sops"
        echo -e "    ├─ Modules: $module_sops"
        echo -e "    ├─ Testing: $test_sops"
        echo -e "    ├─ Security: $security_sops"
        echo -e "    └─ Co-Analysis: $analysis_sops"
    fi
    
    log_action "system" "check" "System status checked"
}

# Enhanced fix with library check
unified_fix() {
    local fix_name=$1
    
    if [ -z "$fix_name" ]; then
        echo -e "${RED}Error: Please provide fix name${NC}"
        echo -e "${YELLOW}Usage: $0 fix [fix-name]${NC}"
        exit 1
    fi
    
    echo -e "${PURPLE}=== Starting Unified Fix: $fix_name ===${NC}\n"
    
    # Log fix start
    log_action "fixes" "start" "Fix: $fix_name"
    
    # Check for related components in library
    echo -e "${BLUE}1. Checking library for related components...${NC}"
    
    # Search based on fix type
    case "$fix_name" in
        *page*|*Page*)
            echo -e "${YELLOW}📚 Available Page Components:${NC}"
            if [ -d "$LIBRARY_DIR/templates/pages" ]; then
                find "$LIBRARY_DIR/templates/pages" -name "*.tsx" 2>/dev/null | while read -r template; do
                    echo -e "  ✓ $(basename "$template" .tsx)"
                done
            fi
            if [ -d "$LIBRARY_DIR/components/layout" ]; then
                echo -e "\n${YELLOW}📚 Layout Components:${NC}"
                find "$LIBRARY_DIR/components/layout" -name "*.tsx" 2>/dev/null | head -5 | while read -r comp; do
                    echo -e "  ✓ $(basename "$comp" .tsx)"
                done
            fi
            ;;
        *api*|*API*)
            echo -e "${YELLOW}📚 API Utilities Available:${NC}"
            if [ -d "$LIBRARY_DIR/utils/api" ]; then
                find "$LIBRARY_DIR/utils/api" -name "*.ts" 2>/dev/null | while read -r util; do
                    echo -e "  ✓ $(basename "$util" .ts)"
                done
            fi
            echo -e "\n${YELLOW}💡 Tip: Use withApiMiddleware from library${NC}"
            ;;
        *security*|*Security*)
            echo -e "${YELLOW}📚 Security Utilities:${NC}"
            if [ -d "$LIBRARY_DIR/utils/security" ]; then
                find "$LIBRARY_DIR/utils/security" -name "*.ts" 2>/dev/null | while read -r util; do
                    echo -e "  ✓ $(basename "$util" .ts)"
                done
            fi
            ;;
    esac
    
    # Check relevant SOPs
    echo -e "\n${BLUE}2. Relevant SOPs:${NC}"
    keywords=$(echo "$fix_name" | tr '-' ' ')
    found_sops=false
    for keyword in $keywords; do
        matches=$(grep -l -i "$keyword" "$ACTIVE_SOP_DIR"/*.md "$SOP_DIR"/*/*.md 2>/dev/null | head -3)
        if [ -n "$matches" ]; then
            found_sops=true
            echo "$matches" | while read -r sop; do
                echo -e "  📋 $(basename "$sop" .md)"
            done
        fi
    done
    [ "$found_sops" = false ] && echo -e "  ${YELLOW}No specific SOPs found${NC}"
    
    # Generate quick guide
    echo -e "\n${BLUE}3. Quick Guide for $fix_name:${NC}"
    case "$fix_name" in
        *contact*page*)
            cat << EOF
${YELLOW}Steps to create contact page:${NC}
1. Use template: cp $_LIBRARY_DIR/templates/pages/ContactTemplate.tsx src/app/(public)/contact/page.tsx
2. Import form components from $_LIBRARY_DIR/components/ui/forms/
3. Follow SOP-ROUTE-MANAGEMENT for route setup
4. Test with: curl http://localhost:3100/contact
EOF
            ;;
        *api*security*)
            cat << EOF
${YELLOW}Steps to fix API security:${NC}
1. Import: import { withApiMiddleware } from '@/$_LIBRARY_DIR/utils/api/middleware'
2. Wrap all routes with withApiMiddleware
3. Follow SOP-API-SECURITY standards
4. Test auth with: ./scripts/test-api-security.sh
EOF
            ;;
        *)
            echo -e "${YELLOW}Check library components and follow relevant SOPs${NC}"
            ;;
    esac
    
    # Start isolated fix
    echo -e "\n${BLUE}4. Starting isolated fix workflow...${NC}"
    if [ -f "./scripts/workflows/isolate-fix.sh" ]; then
        UNIFIED_WORKFLOW=true ./scripts/workflows/isolate-fix.sh "$fix_name"
    else
        echo -e "${RED}Error: isolate-fix.sh not found${NC}"
    fi
}

# Component management
manage_component() {
    local action=$1
    local component=$2
    
    case "$action" in
        find)
            if [ -z "$component" ]; then
                echo -e "${RED}Error: Please provide component name${NC}"
                exit 1
            fi
            echo -e "${BLUE}Searching for component: $component${NC}\n"
            
            # Search in different categories
            for category in components hooks utils templates; do
                matches=$(find "$LIBRARY_DIR/$category" -iname "*$component*" -type f 2>/dev/null)
                if [ -n "$matches" ]; then
                    echo -e "${YELLOW}In $category/:${NC}"
                    echo "$matches" | while read -r file; do
                        relpath=${file#$LIBRARY_DIR/}
                        echo -e "  📦 $relpath"
                    done
                    echo
                fi
            done
            
            log_action "library" "search" "Searched for: $component"
            ;;
            
        create)
            if [ -z "$component" ]; then
                echo -e "${RED}Error: Please provide component name${NC}"
                exit 1
            fi
            
            echo -e "${BLUE}Creating component: $component${NC}\n"
            
            # Component type selection
            echo -e "${YELLOW}Select component type:${NC}"
            echo "1) UI Component"
            echo "2) Business Component"
            echo "3) Layout Component"
            echo "4) Hook"
            echo "5) Utility"
            read -p "Choice (1-5): " choice
            
            case $choice in
                1) comp_dir="$LIBRARY_DIR/components/ui" ;;
                2) comp_dir="$LIBRARY_DIR/components/business" ;;
                3) comp_dir="$LIBRARY_DIR/components/layout" ;;
                4) comp_dir="$LIBRARY_DIR/hooks" ;;
                5) comp_dir="$LIBRARY_DIR/utils" ;;
                *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
            esac
            
            mkdir -p "$comp_dir"
            comp_file="$comp_dir/${component}.tsx"
            
            # Generate component
            cat > "$comp_file" << EOF
/**
 * $component Component
 * Generated: $(date)
 * Category: $(basename "$comp_dir")
 */

import React from 'react'

export interface ${component}Props {
  // Add props here
}

export const $component: React.FC<${component}Props> = (props) => {
  return (
    <div>
      {/* $component implementation */}
    </div>
  )
}

export default $component
EOF
            
            echo -e "${GREEN}✓ Component created: $comp_file${NC}"
            echo -e "${YELLOW}Don't forget to:${NC}"
            echo "1. Add tests"
            echo "2. Update library index"
            echo "3. Document usage"
            
            log_action "library" "create" "Created component: $component"
            ;;
            
        list)
            echo -e "${BLUE}Library Components:${NC}\n"
            
            for category in components/ui components/business components/layout hooks utils; do
                if [ -d "$LIBRARY_DIR/$category" ]; then
                    count=$(find "$LIBRARY_DIR/$category" -name "*.tsx" -o -name "*.ts" 2>/dev/null | wc -l)
                    echo -e "${YELLOW}$category/ ($count items)${NC}"
                    find "$LIBRARY_DIR/$category" -name "*.tsx" -o -name "*.ts" 2>/dev/null | sort | head -5 | while read -r file; do
                        echo -e "  - $(basename "$file" | sed 's/\.[^.]*$//')"
                    done
                    [ $count -gt 5 ] && echo -e "  ... and $((count - 5)) more"
                    echo
                fi
            done
            ;;
            
        *)
            echo -e "${RED}Unknown component action: $action${NC}"
            echo -e "${YELLOW}Available: find, create, list${NC}"
            ;;
    esac
}

# Log management
manage_logs() {
    local action=$1
    local query=$2
    
    case "$action" in
        search)
            if [ -z "$query" ]; then
                echo -e "${RED}Error: Please provide search query${NC}"
                exit 1
            fi
            echo -e "${BLUE}Searching logs for: $query${NC}\n"
            
            # Search in all log categories
            for category in fixes errors performance security; do
                matches=$(grep -r "$query" "$LOGS_DIR/$category" 2>/dev/null | tail -5)
                if [ -n "$matches" ]; then
                    echo -e "${YELLOW}In $category/:${NC}"
                    echo "$matches" | while IFS=: read -r file content; do
                        echo -e "  $(basename "$file"): $content" | cut -c1-80
                    done
                    echo
                fi
            done
            ;;
            
        recent)
            echo -e "${BLUE}Recent Logs (Last 24h):${NC}\n"
            
            for category in fixes errors performance security; do
                recent=$(find "$LOGS_DIR/$category" -name "*.log" -mtime -1 2>/dev/null | sort -r | head -3)
                if [ -n "$recent" ]; then
                    echo -e "${YELLOW}$category/:${NC}"
                    echo "$recent" | while read -r log; do
                        echo -e "  📄 $(basename "$log")"
                        tail -1 "$log" | cut -c1-70
                    done
                    echo
                fi
            done
            ;;
            
        clean)
            echo -e "${YELLOW}Cleaning old logs (>30 days)...${NC}"
            
            total=0
            for category in fixes errors performance security tests build; do
                count=$(find "$LOGS_DIR/$category" -name "*.log" -mtime +30 2>/dev/null | wc -l)
                if [ $count -gt 0 ]; then
                    find "$LOGS_DIR/$category" -name "*.log" -mtime +30 -delete
                    echo -e "  ✓ Cleaned $count logs from $category/"
                    total=$((total + count))
                fi
            done
            
            echo -e "\n${GREEN}Total cleaned: $total logs${NC}"
            log_action "system" "clean" "Cleaned $total old logs"
            ;;
            
        *)
            echo -e "${RED}Unknown log action: $action${NC}"
            echo -e "${YELLOW}Available: search, recent, clean${NC}"
            ;;
    esac
}

# SOP management
manage_sop() {
    local action=$1
    local query=$2
    
    case "$action" in
        find)
            if [ -z "$query" ]; then
                echo -e "${RED}Error: Please provide search term${NC}"
                exit 1
            fi
            
            echo -e "${BLUE}Finding SOPs about: $query${NC}\n"
            
            # Search in active SOPs first
            echo -e "${YELLOW}Active SOPs:${NC}"
            grep -l -i "$query" "$ACTIVE_SOP_DIR"/*.md 2>/dev/null | while read -r sop; do
                echo -e "\n📋 ${GREEN}$(basename "$sop" .md)${NC}"
                grep -i -C2 "$query" "$sop" | head -6 | sed 's/^/  /'
            done
            
            # Search in base SOPs
            echo -e "\n${YELLOW}Base SOPs:${NC}"
            find "$SOP_DIR" -name "*.md" -exec grep -l -i "$query" {} \; 2>/dev/null | head -5 | while read -r sop; do
                echo -e "  📋 $(basename "$sop" .md)"
            done
            ;;
            
        list)
            echo -e "${BLUE}All SOPs:${NC}\n"
            
            echo -e "${YELLOW}Active Project SOPs:${NC}"
            ls -1 "$ACTIVE_SOP_DIR"/SOP-*.md 2>/dev/null | while read -r sop; do
                echo -e "  ✓ $(basename "$sop" .md)"
            done
            
            echo -e "\n${YELLOW}Base Organization SOPs:${NC}"
            for category in core development modules security testing; do
                if [ -d "$SOP_DIR/$category" ]; then
                    count=$(find "$SOP_DIR/$category" -name "SOP-*.md" | wc -l)
                    echo -e "  📁 $category/ ($count SOPs)"
                fi
            done
            ;;
            
        apply)
            if [ -z "$query" ]; then
                echo -e "${RED}Error: Please provide SOP name${NC}"
                exit 1
            fi
            
            echo -e "${BLUE}Applying SOP: $query${NC}\n"
            
            # Find the SOP
            sop_file=$(find "$ACTIVE_SOP_DIR" "$SOP_DIR" -name "*$query*.md" | head -1)
            
            if [ -z "$sop_file" ]; then
                echo -e "${RED}SOP not found: $query${NC}"
                exit 1
            fi
            
            echo -e "${GREEN}Found: $(basename "$sop_file")${NC}\n"
            
            # Extract checklist items
            echo -e "${YELLOW}Checklist from SOP:${NC}"
            grep -E "^- \[ \]" "$sop_file" | head -10 | while read -r item; do
                echo "  $item"
            done
            
            echo -e "\n${YELLOW}Would you like to create a compliance report? (y/N)${NC}"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                report_file="$LOGS_DIR/sop-compliance/$(basename "$sop_file" .md)-$(date +%Y%m%d).md"
                mkdir -p "$LOGS_DIR/sop-compliance"
                
                cat > "$report_file" << EOF
# SOP Compliance Report
**SOP**: $(basename "$sop_file" .md)
**Date**: $(date)
**Status**: In Progress

## Checklist
$(grep -E "^- \[ \]" "$sop_file" | head -20)

## Notes
- Started compliance check
- 
EOF
                echo -e "${GREEN}✓ Report created: $report_file${NC}"
            fi
            
            log_action "sop-compliance" "apply" "Applied SOP: $query"
            ;;
            
        *)
            echo -e "${RED}Unknown SOP action: $action${NC}"
            echo -e "${YELLOW}Available: find, list, apply${NC}"
            ;;
    esac
}

# Sync all systems
sync_systems() {
    echo -e "${PURPLE}=== Syncing All Systems ===${NC}\n"
    
    # 1. Sync SOPs
    echo -e "${BLUE}1. Syncing SOPs...${NC}"
    mkdir -p "$SOP_DIR/current"
    
    # Remove old symlinks
    find "$SOP_DIR/current" -type l -delete 2>/dev/null
    
    # Create new symlinks for active SOPs
    synced=0
    for sop in "$ACTIVE_SOP_DIR"/SOP-*.md; do
        if [ -f "$sop" ]; then
            sop_name=$(basename "$sop")
            ln -sf "../../$sop" "$SOP_DIR/current/$sop_name"
            echo -e "  ✅ $sop_name"
            ((synced++))
        fi
    done
    echo -e "  ${GREEN}Synced $synced SOPs${NC}"
    
    # 2. Update library index
    echo -e "\n${BLUE}2. Updating library index...${NC}"
    index_file="$LIBRARY_DIR/INDEX.md"
    
    cat > "$index_file" << EOF
# Library Index
Generated: $(date)

## Quick Stats
- Components: $(find "$LIBRARY_DIR/components" -name "*.tsx" -o -name "*.ts" 2>/dev/null | wc -l)
- Hooks: $(find "$LIBRARY_DIR/hooks" -name "*.ts" 2>/dev/null | wc -l)
- Utils: $(find "$LIBRARY_DIR/utils" -name "*.ts" 2>/dev/null | wc -l)
- Templates: $(find "$LIBRARY_DIR/templates" -name "*.tsx" 2>/dev/null | wc -l)

## Components
$(find "$LIBRARY_DIR/components" -name "*.tsx" -o -name "*.ts" 2>/dev/null | sort | sed 's/^/- /')

## Hooks
$(find "$LIBRARY_DIR/hooks" -name "*.ts" 2>/dev/null | sort | sed 's/^/- /')

## Utils
$(find "$LIBRARY_DIR/utils" -name "*.ts" 2>/dev/null | sort | sed 's/^/- /')

## Templates
$(find "$LIBRARY_DIR/templates" -name "*.tsx" 2>/dev/null | sort | sed 's/^/- /')
EOF
    
    echo -e "  ✅ Library index updated"
    
    # 3. Clean old logs
    echo -e "\n${BLUE}3. Cleaning old logs...${NC}"
    total_cleaned=0
    for category in fixes errors performance security tests build; do
        old_logs=$(find "$LOGS_DIR/$category" -name "*.log" -mtime +30 2>/dev/null | wc -l)
        if [ $old_logs -gt 0 ]; then
            find "$LOGS_DIR/$category" -name "*.log" -mtime +30 -delete
            echo -e "  ✓ Cleaned $old_logs logs from $category/"
            total_cleaned=$((total_cleaned + old_logs))
        fi
    done
    echo -e "  ${GREEN}Total cleaned: $total_cleaned logs${NC}"
    
    # 4. Generate sync report
    echo -e "\n${BLUE}4. Generating sync report...${NC}"
    sync_report="$LOGS_DIR/reports/sync-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$sync_report" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "synced": {
    "sops": $synced,
    "logs_cleaned": $total_cleaned,
    "library_indexed": true
  },
  "status": "success"
}
EOF
    echo -e "  ✅ Report saved"
    
    log_action "system" "sync" "System sync completed"
    echo -e "\n${GREEN}✅ All systems synced!${NC}"
}

# Generate report
generate_report() {
    local report_type=${1:-daily}
    local report_file="$LOGS_DIR/reports/$report_type/report-$(date +%Y%m%d).md"
    mkdir -p "$LOGS_DIR/reports/$report_type"
    
    echo -e "${BLUE}Generating $report_type report...${NC}\n"
    
    # Gather metrics
    fixes_today=$(find "$LOGS_DIR/fixes" -name "*.log" -mtime -1 2>/dev/null | wc -l)
    errors_today=$(find "$LOGS_DIR/errors" -name "*.log" -mtime -1 2>/dev/null | wc -l)
    total_components=$(find "$LIBRARY_DIR/components" -name "*.tsx" -o -name "*.ts" 2>/dev/null | wc -l)
    active_sops=$(ls -1 "$ACTIVE_SOP_DIR"/SOP-*.md 2>/dev/null | wc -l)
    
    # Generate report
    cat > "$report_file" << EOF
# System Report - $(echo "$report_type" | tr '[:lower:]' '[:upper:]')
Generated: $(date)

## Executive Summary
- System Health: $([ $errors_today -eq 0 ] && echo "✅ Good" || echo "⚠️ Issues Detected")
- Fixes Today: $fixes_today
- Errors Today: $errors_today
- Library Components: $total_components
- Active SOPs: $active_sops

## Activity Summary

### Fixes (Last 24h)
$(find "$LOGS_DIR/fixes" -name "*.log" -mtime -1 -exec tail -1 {} \; 2>/dev/null | tail -5 | sed 's/^/- /')

### Errors (Last 24h)
$(find "$LOGS_DIR/errors" -name "*.log" -mtime -1 -exec tail -1 {} \; 2>/dev/null | tail -5 | sed 's/^/- /')

## Library Usage
- Total Components: $total_components
- Recently Added: $(find "$LIBRARY_DIR" -name "*.tsx" -o -name "*.ts" -mtime -1 2>/dev/null | wc -l)

## SOP Compliance
- Active SOPs: $active_sops
- Linked in _sop/current: $(ls -1 "$SOP_DIR/current" 2>/dev/null | wc -l)

## Recommendations
$([ $errors_today -gt 5 ] && echo "- ⚠️ High error rate detected - investigate errors")
$([ $fixes_today -eq 0 ] && echo "- ℹ️ No fixes today - check if team is blocked")
$([ $total_components -lt 20 ] && echo "- 📦 Build more reusable components")

## Next Actions
1. Review error logs if any
2. Check incomplete fixes
3. Update SOPs based on learnings
4. Sync systems if needed
EOF
    
    echo -e "${GREEN}✅ Report generated: $report_file${NC}\n"
    
    # Show summary
    echo -e "${YELLOW}Report Summary:${NC}"
    echo -e "- Fixes: $fixes_today"
    echo -e "- Errors: $errors_today"
    echo -e "- Components: $total_components"
    echo -e "- SOPs: $active_sops"
    
    log_action "reports" "generate" "Generated $report_type report"
}

# Library management
manage_library() {
    local action=$1
    
    case "$action" in
        index)
            echo -e "${BLUE}Updating library index...${NC}\n"
            
            # Update main index
            manage_component list > /dev/null
            sync_systems > /dev/null
            
            echo -e "${GREEN}✅ Library index updated${NC}"
            echo -e "View at: $LIBRARY_DIR/INDEX.md"
            ;;
            
        stats)
            echo -e "${BLUE}Library Statistics:${NC}\n"
            
            # Component stats
            echo -e "${YELLOW}Components:${NC}"
            for dir in ui business layout; do
                if [ -d "$LIBRARY_DIR/components/$dir" ]; then
                    count=$(find "$LIBRARY_DIR/components/$dir" -name "*.tsx" 2>/dev/null | wc -l)
                    echo -e "  $dir: $count components"
                fi
            done
            
            # Usage stats
            echo -e "\n${YELLOW}Usage in src/:${NC}"
            imports=$(grep -r "from '@/_library" src/ 2>/dev/null | wc -l)
            echo -e "  Import statements: $imports"
            ;;
            
        *)
            echo -e "${RED}Unknown library action: $action${NC}"
            echo -e "${YELLOW}Available: index, stats${NC}"
            ;;
    esac
}

# AI-Driven Problem Analysis Flow
ai_analyze() {
    local problem_description="$1"
    local interactive_mode="${2:-false}"
    
    echo -e "${PURPLE}=== AI-Driven Problem Analysis ===${NC}\n"
    echo -e "${BLUE}Problem/Requirement:${NC} $problem_description\n"
    
    # Step 1: Problem Analysis
    echo -e "${YELLOW}🤖 Step 1: Claude/AI Analysis${NC}"
    local analysis_file="$LOGS_DIR/analysis/analysis-$(date +%Y%m%d-%H%M%S).md"
    mkdir -p "$LOGS_DIR/analysis"
    
    cat > "$analysis_file" << EOF
# AI Problem Analysis
**Date**: $(date)
**Problem**: $problem_description

## Analysis Results
- Problem Type: [Auto-detected]
- Severity: [High/Medium/Low]
- Impact Areas: [List affected modules]
- Dependencies: [List dependencies]

## Recommendations
- [AI-generated recommendations]

EOF
    
    echo -e "  📝 Analysis logged to: $analysis_file"
    
    # Step 2: SOP Understanding
    echo -e "\n${YELLOW}📋 Step 2: SOP Understanding${NC}"
    sop_understanding "$problem_description"
    
    # Step 3: Design Action Plan
    echo -e "\n${YELLOW}🎯 Step 3: Design Action Plan${NC}"
    design_action_plan "$problem_description" "$analysis_file"
    
    # Step 4: Conflict Detection
    echo -e "\n${YELLOW}⚖️ Step 4: Conflict Detection${NC}"
    if detect_conflicts "$problem_description"; then
        if [ "$interactive_mode" = "true" ]; then
            echo -e "${RED}⚠️ Conflicts detected! Requesting PMO decision...${NC}"
            request_pmo_decision "$problem_description" "$analysis_file"
        else
            echo -e "${RED}⚠️ Conflicts detected! Use --interactive for PMO decision flow${NC}"
            return 1
        fi
    else
        echo -e "${GREEN}✅ No conflicts detected - proceeding with fix${NC}"
        execute_action_plan "$problem_description" "$analysis_file"
    fi
}

# SOP Understanding Function
sop_understanding() {
    local problem="$1"
    echo -e "  🔍 Analyzing relevant SOPs..."
    
    # Extract keywords from problem description
    local keywords=$(echo "$problem" | tr '[:upper:]' '[:lower:]' | tr '-' ' ' | tr '_' ' ')
    local relevant_sops=""
    
    # Search for relevant SOPs
    for keyword in $keywords; do
        matches=$(grep -l -i "$keyword" "$ACTIVE_SOP_DIR"/*.md "$SOP_DIR"/*/*.md 2>/dev/null | head -3)
        if [ -n "$matches" ]; then
            relevant_sops="$relevant_sops\n$matches"
        fi
    done
    
    # Display found SOPs
    if [ -n "$relevant_sops" ]; then
        echo -e "  📋 Relevant SOPs found:"
        echo -e "$relevant_sops" | sort -u | while read -r sop; do
            [ -n "$sop" ] && echo -e "    - $(basename "$sop" .md)"
        done
    else
        echo -e "  ${YELLOW}📋 No specific SOPs found - using general guidelines${NC}"
    fi
}

# Design Action Plan Function
design_action_plan() {
    local problem="$1"
    local analysis_file="$2"
    
    echo -e "  🎯 Creating action plan..."
    
    local plan_file="$LOGS_DIR/plans/plan-$(date +%Y%m%d-%H%M%S).md"
    mkdir -p "$LOGS_DIR/plans"
    
    cat > "$plan_file" << EOF
# Action Plan
**Problem**: $problem
**Created**: $(date)
**Analysis**: $analysis_file

## Action Steps
1. [ ] Analyze library for reusable components
2. [ ] Check existing implementations
3. [ ] Design solution following SOPs
4. [ ] Implement solution
5. [ ] Test implementation
6. [ ] Document changes
7. [ ] Commit and log

## Library Check
$(check_library_reuse "$problem")

## Risk Assessment
- Breaking Changes: [Low/Medium/High]
- Dependencies: [List]
- Testing Required: [Unit/Integration/E2E]

EOF
    
    echo -e "  📋 Action plan created: $plan_file"
}

# Check Library Reuse Function
check_library_reuse() {
    local problem="$1"
    
    case "$problem" in
        *page*|*Page*)
            if [ -d "$LIBRARY_DIR/templates/pages" ]; then
                echo "✅ Page templates available"
                find "$LIBRARY_DIR/templates/pages" -name "*.tsx" 2>/dev/null | head -3 | while read -r template; do
                    echo "  - $(basename "$template" .tsx)"
                done
            else
                echo "❌ No page templates - need to create new"
            fi
            ;;
        *component*|*Component*)
            if [ -d "$LIBRARY_DIR/components" ]; then
                echo "✅ Component library available"
                find "$LIBRARY_DIR/components" -name "*.tsx" 2>/dev/null | wc -l | xargs echo "  Total components:"
            else
                echo "❌ No component library - need to create new"
            fi
            ;;
        *api*|*API*)
            if [ -d "$LIBRARY_DIR/utils/api" ]; then
                echo "✅ API utilities available"
                find "$LIBRARY_DIR/utils/api" -name "*.ts" 2>/dev/null | head -3 | while read -r util; do
                    echo "  - $(basename "$util" .ts)"
                done
            else
                echo "❌ No API utilities - need to create new"
            fi
            ;;
        *)
            echo "🔍 Checking for general utilities..."
            ;;
    esac
}

# Conflict Detection Function
detect_conflicts() {
    local problem="$1"
    
    echo -e "  🔍 Checking for potential conflicts..."
    
    # Check for concurrent work
    if [ -d ".fix-tracking" ]; then
        active_fixes=$(find ".fix-tracking" -name "*.md" -exec grep -l "In Progress" {} \; 2>/dev/null | wc -l)
        if [ "$active_fixes" -gt 2 ]; then
            echo -e "    ⚠️ Multiple active fixes detected ($active_fixes)"
            return 0
        fi
    fi
    
    # Check for breaking changes
    case "$problem" in
        *api*|*API*|*security*|*auth*)
            echo -e "    ⚠️ Potential breaking change detected (API/Security)"
            return 0
            ;;
        *database*|*schema*|*migration*)
            echo -e "    ⚠️ Database change detected - requires careful review"
            return 0
            ;;
    esac
    
    # Check git status for uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo -e "    ⚠️ Uncommitted changes detected"
        return 0
    fi
    
    echo -e "    ✅ No conflicts detected"
    return 1
}

# PMO Decision Request Function
request_pmo_decision() {
    local problem="$1"
    local analysis_file="$2"
    
    echo -e "  📞 Requesting PMO decision..."
    
    local decision_file="$LOGS_DIR/decisions/decision-$(date +%Y%m%d-%H%M%S).md"
    mkdir -p "$LOGS_DIR/decisions"
    
    cat > "$decision_file" << EOF
# PMO Decision Request
**Problem**: $problem
**Date**: $(date)
**Analysis**: $analysis_file
**Status**: Pending

## Conflict Details
$(detect_conflicts "$problem" 2>&1)

## Decision Options
1. [ ] Proceed with fix (accept risk)
2. [ ] Modify approach (reduce risk)
3. [ ] Delay until conflicts resolved
4. [ ] Escalate to architecture team

## PMO Decision
**Decision**: [To be filled]
**Reasoning**: [To be filled]
**Approved by**: [To be filled]
**Date**: [To be filled]

EOF
    
    echo -e "  📋 Decision request created: $decision_file"
    echo -e "  ${YELLOW}💡 Please review and get PMO approval before proceeding${NC}"
    
    # Interactive decision (for demo purposes)
    echo -e "\n${YELLOW}PMO Decision Simulation:${NC}"
    echo "1) Proceed with fix (accept risk)"
    echo "2) Modify approach (reduce risk)"
    echo "3) Delay until conflicts resolved"
    read -p "PMO Decision (1-3): " decision
    
    case $decision in
        1)
            echo -e "✅ PMO Decision: Proceed with fix"
            sed -i.bak 's/Status]: Pending/Status]: Approved - Proceed/' "$decision_file"
            execute_action_plan "$problem" "$analysis_file"
            ;;
        2)
            echo -e "⚠️ PMO Decision: Modify approach"
            sed -i.bak 's/Status]: Pending/Status]: Modify Approach/' "$decision_file"
            echo -e "${YELLOW}Please modify the approach and restart analysis${NC}"
            ;;
        3)
            echo -e "⏳ PMO Decision: Delay fix"
            sed -i.bak 's/Status]: Pending/Status]: Delayed/' "$decision_file"
            echo -e "${YELLOW}Fix delayed until conflicts are resolved${NC}"
            ;;
    esac
}

# Execute Action Plan Function
execute_action_plan() {
    local problem="$1"
    local analysis_file="$2"
    
    echo -e "\n${YELLOW}🚀 Step 5: Execute Action Plan${NC}"
    echo -e "  ⚡ Starting implementation..."
    
    # Find reusable library components
    echo -e "\n  📦 Library Reuse Check:"
    if check_library_reuse "$problem" | grep -q "✅"; then
        echo -e "    ${GREEN}✅ Using existing library components${NC}"
    else
        echo -e "    ${YELLOW}📝 Creating new components (will be added to library)${NC}"
    fi
    
    # Update SOP if needed
    echo -e "\n  📋 SOP Update Check:"
    if [ -f "$analysis_file" ] && grep -q "New Better SOP" "$analysis_file" 2>/dev/null; then
        echo -e "    ${YELLOW}📝 SOP update recommended - requesting PMO review${NC}"
        update_sop_request "$problem"
    else
        echo -e "    ✅ No SOP updates needed"
    fi
    
    # Impact Analysis
    echo -e "\n  🎯 Impact Analysis:"
    analyze_impact "$problem"
    
    # Execute the actual fix
    echo -e "\n  🔧 Executing fix:"
    if [ -f "./scripts/workflows/isolate-fix.sh" ]; then
        AI_WORKFLOW=true ./scripts/workflows/isolate-fix.sh "$problem"
    else
        echo -e "    ${RED}❌ isolate-fix.sh not found${NC}"
        return 1
    fi
    
    # Log completion
    log_action "ai-workflow" "complete" "AI workflow completed for: $problem"
    echo -e "\n${GREEN}✅ AI-driven workflow completed successfully!${NC}"
}

# Analyze Impact Function
analyze_impact() {
    local problem="$1"
    
    echo -e "    🔍 Analyzing potential impact areas..."
    
    # Check affected files/modules
    case "$problem" in
        *api*|*API*)
            echo -e "      - API routes and middleware"
            echo -e "      - Authentication/authorization"
            echo -e "      - Database interactions"
            ;;
        *page*|*Page*)
            echo -e "      - Route structure"
            echo -e "      - Navigation components"
            echo -e "      - SEO/metadata"
            ;;
        *component*|*Component*)
            echo -e "      - UI consistency"
            echo -e "      - Prop interfaces"
            echo -e "      - Styling systems"
            ;;
        *)
            echo -e "      - General application functionality"
            ;;
    esac
}

# Update SOP Request Function
update_sop_request() {
    local problem="$1"
    
    local sop_update_file="$LOGS_DIR/sop-updates/update-$(date +%Y%m%d-%H%M%S).md"
    mkdir -p "$LOGS_DIR/sop-updates"
    
    cat > "$sop_update_file" << EOF
# SOP Update Request
**Problem**: $problem
**Date**: $(date)
**Status**: Pending PMO Review

## Proposed SOP Changes
- [Describe changes needed]

## Justification
- [Why these changes improve the process]

## Impact
- [How this affects existing procedures]

EOF
    
    echo -e "      📝 SOP update request created: $sop_update_file"
}

# Main command handler
case "$1" in
    check)
        check_status
        ;;
    fix)
        if [ "$3" = "--ai" ] || [ "$2" = "--ai" ]; then
            ai_analyze "$2" true
        else
            unified_fix "$2"
        fi
        ;;
    ai-analyze|analyze)
        # Use complete AI workflow that follows the full flow
        if [ -f "./scripts/workflows/complete-ai-workflow.sh" ]; then
            chmod +x ./scripts/workflows/complete-ai-workflow.sh
            ./scripts/workflows/complete-ai-workflow.sh "$2" "${3:-false}"
        else
            # Fallback to existing ai_analyze if complete workflow not available
            ai_analyze "$2" "${3:-false}"
        fi
        ;;
    component)
        manage_component "$2" "$3"
        ;;
    log)
        manage_logs "$2" "$3"
        ;;
    sop)
        manage_sop "$2" "$3"
        ;;
    sync)
        sync_systems
        ;;
    report)
        generate_report "$2"
        ;;
    library)
        manage_library "$2"
        ;;
    *)
        show_help
        ;;
esac