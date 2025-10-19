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
