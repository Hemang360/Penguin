# Model Testing Guide

This guide explains how to test your TorchServe model deployment.

## Quick Test

Run the automated test script:

```bash
bash scripts/test_model.sh
```

Or test with a specific image file:

```bash
bash scripts/test_model.sh path/to/image.jpg
```

## Manual Testing

### 1. Check TorchServe Status

```bash
# Ping TorchServe
curl http://127.0.0.1:8080/ping

# List loaded models
curl http://127.0.0.1:8081/models
```

### 2. Test Model Prediction (Direct TorchServe)

```bash
# Using curl with an image file
curl -X POST http://127.0.0.1:8080/predictions/poar_detector \
  -H "Content-Type: image/jpeg" \
  --data-binary @path/to/image.jpg

# Expected response:
# {
#   "authenticity_score": 0.8542,
#   "threshold": 0.6,
#   "status": "AUTHENTIC"
# }
```

### 3. Test via Go API Proxy

If the Go API server is running:

```bash
curl -X POST http://localhost:8787/model/predict \
  -H "Content-Type: image/jpeg" \
  --data-binary @path/to/image.jpg
```

### 4. Test with Python

```python
import requests

# Read image
with open("image.jpg", "rb") as f:
    image_data = f.read()

# Test direct TorchServe
response = requests.post(
    "http://127.0.0.1:8080/predictions/poar_detector",
    data=image_data,
    headers={"Content-Type": "image/jpeg"},
    timeout=30
)

print(response.json())
# {
#   "authenticity_score": 0.8542,
#   "threshold": 0.6,
#   "status": "AUTHENTIC"
# }
```

## Test Script Features

The test script (`scripts/test_model.py`) automatically tests:

1. **TorchServe Health**: Verifies TorchServe is running
2. **Model Listing**: Checks if the model is loaded
3. **Direct Prediction**: Tests the TorchServe prediction endpoint
4. **Go API Proxy**: Tests the Go API proxy endpoint (if running)
5. **Multiple Formats**: Tests PNG and JPEG image formats

## Expected Results

- **Authenticity Score**: Float between 0.0 and 1.0
- **Threshold**: Default is 0.6 (configurable in `models/metadata_local.json`)
- **Status**: Either "AUTHENTIC" or "NOT AUTHENTIC"

## Troubleshooting

### TorchServe Not Running

If tests fail with connection errors:

```bash
# Start TorchServe
bash scripts/start_model_server.sh

# Or manually:
torchserve --start \
  --ncs \
  --model-store model_store \
  --models poar_detector=poar_detector.mar \
  --ts-config scripts/ts_config.properties
```

### Model Not Found

If the model isn't loaded:

```bash
# Package the model first
bash scripts/package_model.sh

# Then restart TorchServe
torchserve --stop
bash scripts/start_model_server.sh
```

### Check Logs

```bash
# TorchServe logs
tail -f logs/model_log.log
tail -f logs/ts_log.log
```

## Test Image Generation

The test script automatically generates test images. You can also use any JPEG or PNG image for testing.

## Continuous Testing

For development, you can run tests in watch mode:

```bash
# Install watchdog (optional)
pip install watchdog

# Run tests periodically
watch -n 5 'bash scripts/test_model.sh'
```

