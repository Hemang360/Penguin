#!/bin/bash
# Package the detector model into a TorchServe .mar file

set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

MODEL_NAME="poar_detector"
MODELS_DIR="models"
MODEL_STORE="model_store"
MODEL_FILE="detector_torchscript_local.pt"
HANDLER_FILE="detector_handler.py"
METADATA_FILE="metadata_local.json"

echo "📦 Packaging model for TorchServe..."

# Activate venv if it exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo "✅ Activated virtual environment"
fi

# Check if model files exist
if [ ! -f "$MODELS_DIR/$MODEL_FILE" ]; then
    echo "❌ Error: Model file not found: $MODELS_DIR/$MODEL_FILE"
    exit 1
fi

if [ ! -f "$MODELS_DIR/$HANDLER_FILE" ]; then
    echo "❌ Error: Handler file not found: $MODELS_DIR/$HANDLER_FILE"
    exit 1
fi

# Create model_store directory if it doesn't exist
mkdir -p "$MODEL_STORE"

# Check if torch-model-archiver is installed
if ! command -v torch-model-archiver &> /dev/null; then
    echo "❌ Error: torch-model-archiver not found"
    echo "Install it with: pip install torchserve torch-model-archiver"
    exit 1
fi

# Package the model
echo "🔨 Creating model archive..."
torch-model-archiver \
    --model-name "$MODEL_NAME" \
    --version 1.0 \
    --handler "$MODELS_DIR/$HANDLER_FILE" \
    --serialized-file "$MODELS_DIR/$MODEL_FILE" \
    --extra-files "$MODELS_DIR/$METADATA_FILE" \
    --export-path "$MODEL_STORE" \
    --force

if [ -f "$MODEL_STORE/${MODEL_NAME}.mar" ]; then
    echo "✅ Model packaged successfully: $MODEL_STORE/${MODEL_NAME}.mar"
else
    echo "❌ Error: Model archive not created"
    exit 1
fi

