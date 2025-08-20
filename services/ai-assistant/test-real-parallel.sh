#!/bin/bash

# Test Real Parallel Claude Instances
echo "🚀 Testing Real Parallel Claude Instances"
echo "=========================================="
echo ""

# Test files
TEST_DIR="/tmp/ai-orchestration-test"
mkdir -p $TEST_DIR

# Create 3 different task files
cat > $TEST_DIR/task1.md << 'EOF'
Analyze the number sequence: 2, 4, 8, 16
What is the next number and why?
Keep your answer brief (1-2 sentences).
EOF

cat > $TEST_DIR/task2.md << 'EOF'
Write a haiku about parallel processing.
Be creative and technical.
EOF

cat > $TEST_DIR/task3.md << 'EOF'
List 3 benefits of microservices architecture.
Keep it concise (bullet points only).
EOF

echo "📝 Created 3 task files"
echo ""

# Function to run Claude in background
run_claude() {
    local task_num=$1
    local task_file=$2
    local output_file=$3
    
    echo "🤖 Starting Agent $task_num..."
    
    # Run Claude with the task file
    claude --no-stream < "$task_file" > "$output_file" 2>&1 &
    
    echo $! > "$TEST_DIR/agent${task_num}.pid"
}

# Start all agents in parallel
echo "🚀 Spawning 3 Claude agents in parallel..."
echo ""

run_claude 1 "$TEST_DIR/task1.md" "$TEST_DIR/output1.txt"
run_claude 2 "$TEST_DIR/task2.md" "$TEST_DIR/output2.txt"
run_claude 3 "$TEST_DIR/task3.md" "$TEST_DIR/output3.txt"

echo "⏳ Waiting for agents to complete..."
echo ""

# Monitor progress
COMPLETE=0
CHECKS=0
MAX_CHECKS=30

while [ $COMPLETE -lt 3 ] && [ $CHECKS -lt $MAX_CHECKS ]; do
    sleep 2
    CHECKS=$((CHECKS + 1))
    
    COMPLETE=0
    for i in 1 2 3; do
        if [ -f "$TEST_DIR/agent${i}.pid" ]; then
            PID=$(cat "$TEST_DIR/agent${i}.pid")
            if ! ps -p $PID > /dev/null 2>&1; then
                COMPLETE=$((COMPLETE + 1))
            fi
        fi
    done
    
    echo "   Status: $COMPLETE/3 agents completed (check $CHECKS/$MAX_CHECKS)"
done

echo ""
echo "📊 Results:"
echo "=========================================="

# Show results
for i in 1 2 3; do
    echo ""
    echo "Agent $i Output:"
    echo "-------------------"
    if [ -f "$TEST_DIR/output${i}.txt" ]; then
        head -n 10 "$TEST_DIR/output${i}.txt"
    else
        echo "No output generated"
    fi
done

echo ""
echo "=========================================="

if [ $COMPLETE -eq 3 ]; then
    echo "✅ All agents completed successfully!"
else
    echo "⚠️  Some agents did not complete in time"
fi

# Cleanup
rm -rf $TEST_DIR

echo "🎉 Test completed!"