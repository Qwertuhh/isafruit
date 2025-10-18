# YOLO11 Setup Guide

This guide will help you set up YOLO11 for real-time fruit and vegetable detection.

## Prerequisites

- Node.js 18+ installed
- Python 3.8+ (for model conversion)
- At least 4GB RAM
- Webcam/camera device

## Step 1: Install Dependencies

```bash
npm install
```

This will install:
- `onnxruntime-node` - Backend inference engine
- `onnxruntime-web` - Browser-based inference (optional)
- `sharp` - Image processing library

## Step 2: Download YOLO11 Model

### Option A: Download Pre-converted ONNX Model

1. Visit [Ultralytics YOLO11 releases](https://github.com/ultralytics/ultralytics)
2. Download `yolo11n.onnx` (nano model, ~6MB)
3. Place it in `public/models/yolo11n.onnx`

### Option B: Convert PyTorch Model to ONNX

```bash
# Install ultralytics
pip install ultralytics

# Export YOLO11 to ONNX format
python -c "from ultralytics import YOLO; YOLO('yolo11n.pt').export(format='onnx')"
```

Then move the generated `yolo11n.onnx` to `public/models/`

## Step 3: Create Models Directory

```bash
mkdir -p public/models
```

## Step 4: Verify Model Setup

Your directory structure should look like:

```text
isafruit/
├── public/
│   └── models/
│       └── yolo11n.onnx    # ~6MB file
├── src/
│   ├── app/
│   ├── components/
│   └── lib/
└── package.json
```

## Step 5: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 6: Test the Application

1. **Allow Camera Permissions** - Browser will request access
2. **Select Camera** - Choose your webcam from dropdown
3. **Start Stream** - Click "Start" button
4. **Enable Detection** - Click "Start Detection" button
5. **Show Objects** - Point camera at fruits, vegetables, or common objects

## Supported Object Classes

The YOLO11 model can detect 80 COCO classes including:

**Fruits & Food:**
- apple, banana, orange, broccoli, carrot
- sandwich, pizza, hot dog, cake, donut

**Kitchen Items:**
- bottle, wine glass, cup, bowl
- fork, knife, spoon

**Common Objects:**
- person, chair, couch, bed, table
- laptop, mouse, keyboard, cell phone
- book, clock, vase, scissors

## Performance Optimization

### Model Selection

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| yolo11n.onnx | 6MB | Fast | Good |
| yolo11s.onnx | 22MB | Medium | Better |
| yolo11m.onnx | 52MB | Slow | Best |

### Inference Settings

Edit `src/lib/yolo/types.ts` to adjust:

```typescript
export const DEFAULT_YOLO_CONFIG: YOLOConfig = {
  modelPath: '/models/yolo11n.onnx',
  inputSize: 640,              // Lower for speed (320, 416, 640)
  confidenceThreshold: 0.45,   // Higher = fewer false positives
  iouThreshold: 0.45,          // Higher = fewer overlapping boxes
  maxDetections: 100,
};
```

## WebRTC Integration

The application includes WebRTC support for streaming:

### Basic Usage

```typescript
import { WebRTCClient } from '@/lib/webrtc/client';

const client = new WebRTCClient();
await client.initialize(mediaStream);
await client.createOffer();
```

### Signaling Server

The app includes a simple HTTP-based signaling server at `/api/webrtc`.

For production, consider:
- WebSocket-based signaling
- TURN server for NAT traversal
- Secure signaling with authentication

## Architecture Overview

```text
┌─────────────┐
│   Browser   │
│  (Webcam)   │
└──────┬──────┘
       │ MediaStream
       ▼
┌─────────────────┐
│  YOLODetector   │
│   Component     │
└──────┬──────────┘
       │ Canvas Frame
       ▼
┌─────────────────┐
│  /api/inference │
│  (Next.js API)  │
└──────┬──────────┘
       │ Image Data
       ▼
┌─────────────────┐
│ ONNX Runtime    │
│  (YOLO11)       │
└──────┬──────────┘
       │ Detections
       ▼
┌─────────────────┐
│  Canvas Overlay │
│  (Annotations)  │
└─────────────────┘
```

## Troubleshooting

### Model Not Found Error

```text
Error: Model not found at /models/yolo11n.onnx
```

**Solution:** Ensure the model file exists in `public/models/yolo11n.onnx`

### Low FPS / Slow Inference

**Solutions:**
- Use smaller model (yolo11n instead of yolo11m)
- Reduce input size (320 instead of 640)
- Lower video resolution
- Use GPU acceleration (requires onnxruntime-gpu)

### Camera Permission Denied

**Solutions:**
- Check browser permissions in settings
- Use HTTPS in production (required by browsers)
- Try different browser

### No Detections Appearing

**Solutions:**
- Lower confidence threshold (e.g., 0.25)
- Ensure good lighting
- Check if objects are in supported classes
- Verify model loaded successfully (check console)

## Advanced Configuration

### GPU Acceleration

For better performance, use GPU acceleration:

```bash
npm install onnxruntime-node-gpu
```

Update `src/app/api/inference/route.ts`:

```typescript
session = await ort.InferenceSession.create(modelPath, {
  executionProviders: ['cuda', 'cpu'], // Try CUDA first
  graphOptimizationLevel: 'all',
});
```

### Custom Model Training

To train on custom fruit/vegetable dataset:

1. Prepare dataset in YOLO format
2. Train using Ultralytics:

```bash
yolo train data=fruits.yaml model=yolo11n.pt epochs=100
```

3. Export to ONNX:

```bash
yolo export model=runs/detect/train/weights/best.pt format=onnx
```

4. Update class names in `src/lib/yolo/types.ts`

## Production Deployment

### Vercel Deployment

```bash
npm run build
vercel deploy
```

**Note:** ONNX Runtime Node may have issues on serverless. Consider:
- Using onnxruntime-web for client-side inference
- Deploying to a VPS with Node.js support
- Using edge functions with WASM

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Resources

- [YOLO11 Documentation](https://docs.ultralytics.com/)
- [ONNX Runtime Docs](https://onnxruntime.ai/)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

## License

This project uses YOLO11 which is licensed under AGPL-3.0.
For commercial use, obtain a license from Ultralytics.
