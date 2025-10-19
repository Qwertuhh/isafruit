# YOLO11 Model Setup

This directory contains tools for downloading and converting YOLO11 models for use in the isafruit project.

## Quick Start

Run the complete setup (download + convert) with one command:

```bash
npm run setup-model
```

## Step-by-Step Setup

If you prefer to run each step separately:

### 1. Download the Model

```bash
npm run download-model
```

This downloads the YOLO11n PyTorch model (~6MB) to `public/models/yolo11n.pt`.

### 2. Convert to ONNX

```bash
npm run convert-model
```

This converts the PyTorch model to ONNX format for browser/Node.js inference.

## Requirements

- **Node.js** (for download script)
- **Python 3.13+** (for conversion)
- **uv** (Python package manager) - [Install uv](https://github.com/astral-sh/uv)

### Installing Python Dependencies

The conversion script uses `uv` to manage Python dependencies. Dependencies are automatically installed when you run:

```bash
cd scripts/model
uv sync
```

Or they'll be installed automatically when running `npm run convert-model`.

## Model Variants

By default, the scripts use `yolo11n` (nano - smallest and fastest). You can modify the scripts to use other variants:

- `yolo11n` - Nano (6MB, fastest)
- `yolo11s` - Small (22MB)
- `yolo11m` - Medium (50MB)
- `yolo11l` - Large (100MB)
- `yolo11x` - Extra Large (200MB)

To convert a different model variant:

```bash
cd scripts/model
uv run model-convertor/main.py yolo11s
```

## Output Files

After successful setup, you'll have:

- `public/models/yolo11n.pt` - Original PyTorch model
- `public/models/yolo11n.onnx` - Converted ONNX model (used by the app)

## Troubleshooting

### "ultralytics package not found"

```bash
cd scripts/model
uv sync
```

### "PyTorch model not found"

Run the download script first:

```bash
npm run download-model
```

### "uv: command not found"

Install uv:

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Conversion fails

1. Ensure Python 3.13+ is installed: `python --version`
2. Re-download the model: `npm run download-model`
3. Check disk space (need ~20MB free)
4. Try running conversion directly:
   ```bash
   cd scripts/model
   uv run model-convertor/main.py
   ```

## Manual Setup

If automated scripts fail, you can download and convert manually:

### Manual Download

1. Download from: https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt
2. Place in: `public/models/yolo11n.pt`

### Manual Conversion

```bash
cd scripts/model
uv sync
uv run model-convertor/main.py
```

## Architecture

```
scripts/
├── download-model.ts          # Downloads .pt model from GitHub
└── model/
    ├── pyproject.toml         # Python dependencies
    ├── README.md              # This file
    └── model-convertor/
        └── main.py            # Converts .pt to .onnx
```

## Development

### Adding New Model Support

1. Update `MODEL_URL` in `download-model.ts`
2. Update model name in conversion script
3. Update model path references in the app

### Testing

After setup, verify the model works:

```bash
npm run dev
```

Navigate to the app and test object detection functionality.

## Python Inference Services

The project includes Python FastAPI services for GPU-accelerated inference using PyTorch and Ultralytics YOLO.

### Services

1. **Inference Service** (`inference/main.py`) - Port 8001

   - Real-time video frame inference
   - WebRTC support
   - GPU acceleration with CUDA

2. **Photo Detection Service** (`photo-detect/main.py`) - Port 8002
   - Single image detection
   - Returns annotated images with bounding boxes
   - GPU acceleration with CUDA

### Setup Python Services

1. **Install Dependencies**

```bash
cd services/model
uv sync
```

This installs:

- FastAPI & Uvicorn (web server)
- PyTorch (GPU support)
- Ultralytics YOLO
- OpenCV, Pillow, NumPy

2. **Download YOLO Model**

Ensure you have the `.pt` model file:

```bash
npm run download-model
```

3. **Configure Environment**

Create `.env.local` in the project root:

```bash
PYTHON_INFERENCE_URL=http://localhost:8001
PYTHON_PHOTO_DETECT_URL=http://localhost:8002
```

### Running Python Services

**Start Inference Service:**

```bash
cd services/model/inference
uv run main.py
```

**Start Photo Detection Service:**

```bash
cd services/model/photo-detect
uv run main.py
```

### GPU Support

The Python services automatically detect and use NVIDIA GPUs with CUDA:

- **CUDA Available**: Uses GPU acceleration
- **No CUDA**: Falls back to CPU

Check GPU status:

```bash
# Test inference service
curl http://localhost:8001/inference

# Test photo-detect service
curl http://localhost:8002/photo-detect
```

### Using Python Backend in UI

1. Start the Python services (ports 8001 & 8002)
2. Start the Next.js app: `npm run dev`
3. In the UI, toggle **Backend** to "Python (FastAPI)"
4. The app will route inference requests to Python services

### API Endpoints

**Inference Service (Port 8001)**

- `GET /` - Root endpoint
- `GET /inference` - Health check with GPU info
- `POST /inference` - Run inference on image
  ```json
  {
    "image": "base64_encoded_image",
    "width": 640,
    "height": 480
  }
  ```

**Photo Detection Service (Port 8002)**

- `GET /` - Root endpoint
- `GET /photo-detect` - Health check with GPU info
- `POST /photo-detect` - Detect and annotate image
  ```json
  {
    "image": "base64_encoded_image",
    "width": 640,
    "height": 480
  }
  ```

### Performance

**Python Backend (GPU)**:

- Faster inference with CUDA
- Better for high-throughput scenarios
- Native PyTorch operations

**Node.js Backend (ONNX)**:

- No Python runtime required
- Easier deployment
- Good CPU performance

### Troubleshooting

**"Python backend not available"**

1. Check services are running:

   ```bash
   curl http://localhost:8001/inference
   curl http://localhost:8002/photo-detect
   ```

2. Check `.env.local` configuration

3. Verify Python dependencies:
   ```bash
   cd services/model
   uv sync
   ```

**"CUDA not available"**

- Install NVIDIA drivers and CUDA toolkit
- Verify: `python -c "import torch; print(torch.cuda.is_available())"`
- Services will fall back to CPU if CUDA unavailable

**Port conflicts**

Change ports in service files:

- `inference/main.py`: Line 231 - `uvicorn.run(app, host="0.0.0.0", port=8001)`
- `photo-detect/main.py`: Line 277 - `uvicorn.run(app, host="0.0.0.0", port=8002)`

And update `.env.local` accordingly.
