#!/bin/bash
# Monitor memory usage of Node.js workers
#
# Usage: ./monitor-memory.sh <PID> [interval]
#
# Example: ./monitor-memory.sh 12345 5
#   Monitors process 12345 every 5 seconds

PID=$1
INTERVAL=${2:-5} # Default 5 seconds

if [ -z "$PID" ]; then
  echo "Usage: ./monitor-memory.sh <PID> [interval]"
  echo ""
  echo "Example:"
  echo "  ./monitor-memory.sh 12345 5"
  echo ""
  echo "To find worker PIDs:"
  echo "  ps aux | grep 'analyze.worker\\|images.worker\\|render.worker'"
  exit 1
fi

# Check if process exists
if ! ps -p $PID > /dev/null 2>&1; then
  echo "Error: Process $PID not found"
  exit 1
fi

echo "Monitoring PID $PID every ${INTERVAL}s (Press Ctrl+C to stop)"
echo "TIME,RSS(MB),HEAP(MB),EXTERNAL(MB),CPU(%)"

# Monitor loop
while true; do
  # Check if process still exists
  if ! ps -p $PID > /dev/null 2>&1; then
    echo "Process $PID has terminated"
    exit 0
  fi

  # Get memory info from ps
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    MEMORY_INFO=$(ps -p $PID -o rss=,cpu=)
  else
    # Linux/Windows (Git Bash)
    MEMORY_INFO=$(ps -p $PID -o rss=,pcpu=)
  fi

  if [ -z "$MEMORY_INFO" ]; then
    echo "Failed to get memory info for PID $PID"
    exit 1
  fi

  # Parse RSS and CPU
  RSS_KB=$(echo $MEMORY_INFO | awk '{print $1}')
  CPU=$(echo $MEMORY_INFO | awk '{print $2}')

  # Convert RSS from KB to MB
  RSS_MB=$(echo "scale=2; $RSS_KB / 1024" | bc)

  # Get timestamp
  TIMESTAMP=$(date +"%H:%M:%S")

  # Output CSV format
  echo "$TIMESTAMP,$RSS_MB,0,0,$CPU"

  sleep $INTERVAL
done
