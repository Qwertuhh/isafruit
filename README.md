# Is A Fruit

A real-time fruit and vegetable detection application powered by YOLO11 with GPU acceleration and OpenCV.js for optimized video processing.

> [!WARNING]
> - This a discontinued project, If you still want to use it or contribute to it.

## Features

- 🚀 **GPU Acceleration**: Automatic NVIDIA CUDA support for faster inference (2-4GB VRAM)
- 🎬 **Real-time Video Detection**: Live webcam detection with adjustable FPS
- 📸 **Photo Detection**: Upload and analyze images
- ⚡ **OpenCV.js Integration**: Hardware-accelerated frame processing
- 📊 **Performance Monitoring**: Real-time FPS and inference time tracking
- 🎯 **High Accuracy**: YOLO11n model for object detection

> [!IMPORTANT]
> - Use your own **API Keys**

## GPU Requirements (Optional)

The application automatically detects and uses NVIDIA GPUs with:

- **Memory**: 2-4GB VRAM (optimal range)
- **CUDA Support**: Automatically enabled if available
- **Fallback**: Seamlessly falls back to CPU if GPU is unavailable

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

### Video Detection

1. Navigate to the home page
2. Select your camera from the dropdown
3. Click "Start" to begin video stream
4. Click "Start Detection" to enable real-time object detection
5. Adjust target FPS using the slider (1-30 FPS)
6. Toggle OpenCV.js for hardware-accelerated frame processing

### Photo Detection

1. Navigate to the Photo page
2. Upload an image or capture from webcam
3. View detected objects with bounding boxes and confidence scores

## GPU Acceleration

The application automatically detects and uses GPU acceleration:

### Backend (ONNX Runtime)

- **CUDA Provider**: Used if NVIDIA GPU is detected with 2-4GB VRAM
- **CPU Fallback**: Automatically used if GPU is unavailable
- **Memory Management**: Optimized for GPUs with limited memory

### Frontend (OpenCV.js)

- **Hardware Acceleration**: Utilizes WebGL for frame processing
- **Optimized Pipeline**: Direct video element processing
- **Fallback**: Canvas-based processing if OpenCV.js fails to load

### Checking GPU Status

The application displays GPU information in:

- Video detection overlay (GPU/CPU icon)
- API health check endpoints (`/api/inference` and `/api/photo-detect`)
- Console logs during model initialization

## Performance Optimization

### For GPU Users (NVIDIA 2-4GB VRAM)

- Expected inference time: 20-50ms per frame
- Recommended FPS: 15-30 FPS
- Enable OpenCV.js for best performance

### For CPU Users

- Expected inference time: 100-300ms per frame
- Recommended FPS: 5-10 FPS
- Lower image quality for faster encoding

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── inference/       # GPU-accelerated inference API
│   │   └── photo-detect/    # Photo detection with GPU support
│   ├── photo/               # Photo detection page
│   └── page.tsx             # Video detection page
├── components/
│   ├── YOLODetector.tsx     # Real-time video detection component
│   └── PhotoCapture.tsx     # Photo capture component
└── lib/
    └── yolo/
        ├── types.ts         # Type definitions and GPU info
        ├── preprocessing.ts # OpenCV.js frame processing
        └── postprocessing.ts# Detection drawing and NMS
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run download-model` - Download YOLO11 model
- `npm run convert-model` - Convert model to ONNX format
- `npm run setup-model` - Download and convert model (recommended)

## Technologies

- **Next.js 15** - React framework with App Router
- **YOLO11n** - State-of-the-art object detection model
- **ONNX Runtime** - Cross-platform inference with GPU support
- **OpenCV.js** - Computer vision library for web
- **Sharp** - High-performance image processing
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Re-usable component library

## Troubleshooting

### GPU Not Detected

1. Ensure NVIDIA drivers are installed
2. Verify `nvidia-smi` command works in terminal
3. Check GPU memory is within 2-4GB range
4. Restart the development server

### OpenCV.js Not Loading

1. Check internet connection (loads from CDN)
2. Clear browser cache
3. Disable ad blockers that might block CDN requests
4. The app will fallback to canvas processing automatically

### Slow Inference

1. Lower target FPS
2. Reduce video resolution in camera settings
3. Enable OpenCV.js if available
4. Check if GPU is being utilized (check console logs)

## Learn More

- [YOLO11 Documentation](https://docs.ultralytics.com/models/yolo11/)
- [ONNX Runtime](https://onnxruntime.ai/)
- [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- [Next.js Documentation](https://nextjs.org/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
