#!/bin/bash
# Start TorchServe with the detector model
# This script can be called from anywhere and will find the project root

set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

MODEL_NAME="poar_detector"
MODEL_STORE="model_store"
PORT_INFER=8080
PORT_MGMT=8081

echo "🚀 Starting TorchServe model server..."
echo "   Project root: $PROJECT_ROOT"

# Activate venv if it exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo "✅ Activated virtual environment"
fi

# Check if torchserve is available
if ! command -v torchserve &> /dev/null; then
    echo "❌ Error: torchserve command not found"
    echo "   Make sure TorchServe is installed: pip install torchserve"
    exit 1
fi

# Check if model archive exists
if [ ! -f "$MODEL_STORE/${MODEL_NAME}.mar" ]; then
    echo "❌ Error: Model archive not found: $MODEL_STORE/${MODEL_NAME}.mar"
    echo "   Run: bash scripts/package_model.sh first"
    exit 1
fi

# Ensure model_store exists
if [ ! -d "$MODEL_STORE" ]; then
    echo "❌ Error: Model store directory not found: $MODEL_STORE"
    exit 1
fi

# Ensure logs directory exists
mkdir -p logs

# Stop any existing TorchServe instance
echo "🛑 Stopping any existing TorchServe instances..."
torchserve --stop 2>/dev/null || true
sleep 2

# Start TorchServe in background (daemon mode)
echo "▶️  Starting TorchServe..."
echo "   Model: $MODEL_NAME"
echo "   Inference: http://127.0.0.1:$PORT_INFER"
echo "   Management: http://127.0.0.1:$PORT_MGMT"
echo "   Model store: $MODEL_STORE"

# Use absolute path for ts-config
TS_CONFIG="$PROJECT_ROOT/scripts/ts_config.properties"

# Start TorchServe (--start runs it as a daemon in background)
torchserve \
    --start \
    --ncs \
    --model-store "$MODEL_STORE" \
    --models "${MODEL_NAME}=${MODEL_NAME}.mar" \
    --ts-config "$TS_CONFIG" \
    --disable-token-auth

# Wait for TorchServe to start (up to 30 seconds)
echo "⏳ Waiting for TorchServe to be ready..."
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://127.0.0.1:${PORT_INFER}/ping > /dev/null 2>&1; then
        echo "✅ TorchServe is running!"
        echo "   Ping: http://127.0.0.1:$PORT_INFER/ping"
        echo "   Predictions: http://127.0.0.1:$PORT_INFER/predictions/$MODEL_NAME"
        exit 0
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

echo "⚠️  Warning: TorchServe did not respond within $MAX_WAIT seconds"
echo "   It may still be starting. Check logs: tail -f logs/model_log.log"
exit 1

