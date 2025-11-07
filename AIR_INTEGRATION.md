# Air + TorchServe Integration Guide

This document explains how the Air development server automatically starts and manages the TorchServe model server.

## Architecture

When you run `air` from the `api/` directory:

1. **Air** starts and watches for Go file changes
2. **Go Server** (`cmd/server/main.go`) starts and calls `startModelServer()`
3. **startModelServer()** executes `scripts/start_model_server.sh`
4. **TorchServe** starts as a background daemon on port 8080
5. **Go Server** waits for TorchServe to be ready (up to 30 seconds)
6. **Go Server** starts serving on port 8787 with proxy endpoints to TorchServe

## Endpoints

Once everything is running:

- **TorchServe Direct**: `http://127.0.0.1:8080/predictions/poar_detector`
- **Go API Proxy**: `http://localhost:8787/model/predict`
- **Health Check**: `http://localhost:8787/health`

## Quick Start

### 1. Package the Model (First Time Only)

```bash
bash scripts/package_model.sh
```

This creates `model_store/poar_detector.mar`.

### 2. Start the Development Server

```bash
cd api
air
```

The server will automatically:
- Start TorchServe in the background
- Wait for it to be ready
- Start the Go API server on port 8787

### 3. Test the Integration

In another terminal:

```bash
# Test health endpoint
curl http://localhost:8787/health

# Test model prediction via Go API
curl -X POST http://localhost:8787/model/predict \
  -H "Content-Type: image/png" \
  --data-binary @/path/to/image.png

# Test direct TorchServe endpoint
curl -X POST http://127.0.0.1:8080/predictions/poar_detector \
  -H "Content-Type: image/png" \
  --data-binary @/path/to/image.png
```

## How It Works

### 1. Go Server (`api/cmd/server/main.go`)

The `startModelServer()` function:

```go
func startModelServer() {
    // Finds project root (works from api/ directory)
    projectRoot := filepath.Join(wd, "..")
    scriptPath := filepath.Join(projectRoot, "scripts", "start_model_server.sh")
    
    // Starts the script in background
    cmd := exec.Command("bash", scriptPath)
    cmd.Dir = projectRoot
    cmd.Start()
    
    // Waits for TorchServe to be ready (polls /ping endpoint)
    for i := 0; i < 30; i++ {
        resp, err := http.Get("http://127.0.0.1:8080/ping")
        if err == nil && resp.StatusCode == 200 {
            log.Println("✅ TorchServe is ready")
            return
        }
        time.Sleep(1 * time.Second)
    }
}
```

### 2. Start Script (`scripts/start_model_server.sh`)

The script:
- Finds the project root (works from any directory)
- Activates the virtual environment
- Stops any existing TorchServe instance
- Starts TorchServe as a daemon with `--start` flag
- Waits for TorchServe to respond to ping
- Exits with success/failure status

### 3. Air Configuration (`api/air.toml`)

Air is configured to:
- Watch for Go file changes in the `api/` directory
- Exclude `venv`, `model_store`, and other non-Go directories
- Rebuild and restart the server on file changes

**Note**: TorchServe is NOT restarted on code changes - only the Go server restarts. If you need to restart TorchServe, stop it manually and let the Go server start it again.

## Testing

### Automated Tests

Run the integration test:

```bash
bash scripts/test_air_integration.sh
```

This will:
1. Stop any existing servers
2. Build and start the Go server manually
3. Verify TorchServe starts automatically
4. Test all endpoints
5. Clean up

### Manual Verification

1. **Check TorchServe is running**:
   ```bash
   curl http://127.0.0.1:8080/ping
   ```

2. **Check Go API is running**:
   ```bash
   curl http://localhost:8787/health
   ```

3. **Test model prediction**:
   ```bash
   curl -X POST http://localhost:8787/model/predict \
     -H "Content-Type: image/png" \
     --data-binary @test_image.png
   ```

## Troubleshooting

### TorchServe Doesn't Start

**Symptoms**: Go server logs show "TorchServe did not respond in time"

**Solutions**:
1. Check if TorchServe is installed:
   ```bash
   torchserve --version
   ```

2. Check if the model is packaged:
   ```bash
   ls -la model_store/poar_detector.mar
   ```

3. Try starting TorchServe manually:
   ```bash
   bash scripts/start_model_server.sh
   ```

4. Check TorchServe logs:
   ```bash
   tail -f logs/model_log.log
   tail -f logs/ts_log.log
   ```

### Port Already in Use

**Symptoms**: "Address already in use" error

**Solutions**:
1. Stop existing TorchServe:
   ```bash
   torchserve --stop
   ```

2. Kill any processes on the ports:
   ```bash
   # Port 8080 (TorchServe)
   lsof -ti:8080 | xargs kill -9
   
   # Port 8787 (Go API)
   lsof -ti:8787 | xargs kill -9
   ```

### Go Server Can't Find Script

**Symptoms**: "Failed to start TorchServe: exec: bash: executable file not found"

**Solutions**:
1. Make sure the script is executable:
   ```bash
   chmod +x scripts/start_model_server.sh
   ```

2. Check the path logic in `main.go` - it should work from the `api/` directory

### Model Not Found

**Symptoms**: "Model archive not found"

**Solutions**:
1. Package the model:
   ```bash
   bash scripts/package_model.sh
   ```

2. Verify the model exists:
   ```bash
   ls -la model_store/poar_detector.mar
   ```

## Development Workflow

1. **First time setup**:
   ```bash
   # Install dependencies
   pip install -r requirements.txt
   
   # Package model
   bash scripts/package_model.sh
   ```

2. **Start development**:
   ```bash
   cd api
   air
   ```

3. **Make changes**: Edit Go files, Air will automatically rebuild and restart

4. **Test changes**: Use curl or the test scripts to verify endpoints

5. **Stop servers**:
   ```bash
   # Stop TorchServe
   torchserve --stop
   
   # Stop Air (Ctrl+C in the terminal where it's running)
   ```

## Production Deployment

For production, consider:

1. **Separate Services**: Run TorchServe as a separate service (systemd, Docker, etc.)
2. **Health Checks**: Add health check endpoints and monitoring
3. **Process Management**: Use a process manager (systemd, supervisor, etc.)
4. **Logging**: Set up proper logging and log rotation
5. **Resource Limits**: Configure CPU/GPU limits for TorchServe
6. **Scaling**: Use multiple TorchServe instances behind a load balancer

## Files

- `api/cmd/server/main.go` - Go server with TorchServe integration
- `scripts/start_model_server.sh` - Script to start TorchServe
- `scripts/package_model.sh` - Script to package the model
- `api/air.toml` - Air configuration
- `scripts/ts_config.properties` - TorchServe configuration

## Summary

✅ **Automatic**: TorchServe starts automatically when you run `air`  
✅ **Robust**: Waits for TorchServe to be ready before serving requests  
✅ **Integrated**: Go API proxies requests to TorchServe seamlessly  
✅ **Tested**: Test scripts verify the integration works correctly  

When you run `air`, everything just works! 🚀

