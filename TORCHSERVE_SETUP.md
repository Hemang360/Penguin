# TorchServe Model Server Setup

This guide explains how to set up and use the TorchServe model server with your Go API.

## Overview

The detector model is automatically started when you run the Go server. The model is available at:
- **TorchServe**: `http://127.0.0.1:8080/predictions/poar_detector`
- **Go API Proxy**: `http://localhost:8787/model/predict`

## Prerequisites

1. **Python 3.8+** with pip
2. **PyTorch** and **TorchServe** installed

## Installation

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Or install manually:
```bash
pip install torch torchvision torchserve torch-model-archiver Pillow
```

### 2. Package the Model

Before running the server, you need to package the model into a `.mar` file:

```bash
bash scripts/package_model.sh
```

This will:
- Check that all model files exist
- Create a `model_store/` directory
- Package the model into `model_store/poar_detector.mar`

## Running the Server

### Automatic (Recommended)

When you start the Go server using Air:

```bash
cd api
air
```

The Go server will automatically:
1. Start TorchServe in the background
2. Wait for TorchServe to be ready (up to 30 seconds)
3. Make the model available at `/model/predict`

### Manual Start

If you want to start TorchServe manually:

```bash
bash scripts/start_model_server.sh
```

Then start your Go server separately.

## API Endpoints

### Model Inference

**Endpoint**: `POST /model/predict`

**Request**:
- Content-Type: `image/jpeg`, `image/png`, or `image/*`
- Body: Raw image bytes

**Response**:
```json
{
  "authenticity_score": 0.8542,
  "threshold": 0.6,
  "status": "AUTHENTIC"
}
```

**Example using curl**:
```bash
curl -X POST http://localhost:8787/model/predict \
  -H "Content-Type: image/jpeg" \
  --data-binary @path/to/image.jpg
```

**Example using Python**:
```python
import requests

with open("image.jpg", "rb") as f:
    response = requests.post(
        "http://localhost:8787/model/predict",
        data=f.read(),
        headers={"Content-Type": "image/jpeg"}
    )
print(response.json())
```

### Direct TorchServe Access

You can also access TorchServe directly:

```bash
curl -X POST http://127.0.0.1:8080/predictions/poar_detector \
  -H "Content-Type: image/jpeg" \
  --data-binary @image.jpg
```

## Model Files

The model uses these files from the `models/` directory:
- `detector_torchscript_local.pt` - The PyTorch model
- `detector_handler.py` - TorchServe handler
- `metadata_local.json` - Model metadata (threshold, etc.)

## Troubleshooting

### Model Not Found

If you see "Model archive not found":
```bash
# Package the model first
bash scripts/package_model.sh
```

### TorchServe Not Starting

Check if TorchServe is installed:
```bash
torchserve --version
```

If not installed:
```bash
pip install torchserve torch-model-archiver
```

### Port Already in Use

If port 8080 is already in use:
```bash
# Stop existing TorchServe
torchserve --stop

# Or kill the process
pkill -f torchserve
```

### Check TorchServe Status

```bash
# Ping TorchServe
curl http://127.0.0.1:8080/ping

# List models
curl http://127.0.0.1:8081/models
```

### View Logs

TorchServe logs are in:
- `logs/model_log.log` - Model logs
- `logs/ts_log.log` - TorchServe logs

## Configuration

### Model Settings

Edit `models/metadata_local.json` to change the threshold:
```json
{
  "threshold": 0.6,
  "best_train_acc": 1.0
}
```

### TorchServe Settings

Edit `scripts/ts_config.properties` to change:
- Port numbers (default: 8080 for inference, 8081 for management)
- Number of workers
- GPU settings

## Development Workflow

1. **First Time Setup**:
   ```bash
   pip install -r requirements.txt
   bash scripts/package_model.sh
   ```

2. **Start Development Server**:
   ```bash
   cd api
   air
   ```

3. **Test Model**:
   ```bash
   curl -X POST http://localhost:8787/model/predict \
     -H "Content-Type: image/jpeg" \
     --data-binary @test_image.jpg
   ```

## Production Deployment

For production, consider:
1. Running TorchServe as a separate service
2. Using a process manager (systemd, supervisor, etc.)
3. Setting up health checks and monitoring
4. Using GPU acceleration if available

## Files Created

- `model_store/poar_detector.mar` - Packaged model archive
- `logs/` - TorchServe logs (created automatically)

