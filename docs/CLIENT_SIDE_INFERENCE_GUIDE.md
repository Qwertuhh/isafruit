# Client-Side YOLO Inference Implementation Guide

## Overview
Running YOLO inference directly in the browser eliminates network latency and server load, providing the best performance for real-time detection.

## Prerequisites

### 1. Install ONNX Runtime Web
```bash
npm install onnxruntime-web
```

### 2. Ensure ONNX Model is Accessible
The model should be in `public/models/yolo11n.onnx` (already present in your project).

## Implementation Steps

### Step 1: Create ONNX Session Hook

Create `src/hooks/useYOLOSession.ts`:

```typescript
import { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';

export function useYOLOSession() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<ort.InferenceSession | null>(null);

  useEffect(() => {
    async function initSession() {
      try {
        // Configure ONNX Runtime
        ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
        
        // Load model
        const session = await ort.InferenceSession.create('/models/yolo11n.onnx', {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        
        sessionRef.current = session;
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load model');
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  return { session: sessionRef.current, isLoading, error };
}
```

### Step 2: Create Client-Side Preprocessing

Create `src/lib/yolo/clientPreprocessing.ts`:

```typescript
/**
 * Preprocess image data for YOLO inference in browser
 */
export function preprocessImageData(
  imageData: ImageData,
  inputSize: number = 640
): Float32Array {
  const { width, height, data } = imageData;
  
  // Create tensor [1, 3, inputSize, inputSize]
  const tensor = new Float32Array(3 * inputSize * inputSize);
  
  // Calculate scaling factors
  const scaleX = width / inputSize;
  const scaleY = height / inputSize;
  
  // Convert RGBA to RGB and normalize to [0, 1]
  for (let y = 0; y < inputSize; y++) {
    for (let x = 0; x < inputSize; x++) {
      // Map to original image coordinates
      const origX = Math.floor(x * scaleX);
      const origY = Math.floor(y * scaleY);
      const origIdx = (origY * width + origX) * 4;
      
      // YOLO expects CHW format (channels first)
      const tensorIdx = y * inputSize + x;
      tensor[tensorIdx] = data[origIdx] / 255.0; // R
      tensor[inputSize * inputSize + tensorIdx] = data[origIdx + 1] / 255.0; // G
      tensor[2 * inputSize * inputSize + tensorIdx] = data[origIdx + 2] / 255.0; // B
    }
  }
  
  return tensor;
}
```

### Step 3: Update YOLODetector Component

Modify `src/components/YOLODetector.tsx`:

```typescript
import * as ort from 'onnxruntime-web';
import { useYOLOSession } from '@/hooks/useYOLOSession';
import { preprocessImageData } from '@/lib/yolo/clientPreprocessing';
import { processYOLOOutput } from '@/lib/yolo/postprocessing';
import { DEFAULT_YOLO_CONFIG, FRUIT_VEGETABLE_CLASSES } from '@/lib/yolo/types';

export function YOLODetector() {
  // ... existing state ...
  const { session, isLoading: isModelLoading, error: modelError } = useYOLOSession();

  // Replace captureAndDetect function:
  const captureAndDetect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isDetecting || !session) return;

    // Skip if inference is already in progress
    if (isInferringRef.current) {
      animationFrameRef.current = requestAnimationFrame(captureAndDetect);
      return;
    }

    // Throttle based on target FPS
    const now = performance.now();
    const minInterval = 1000 / targetFps;
    if (now - lastInferenceTimeRef.current < minInterval) {
      animationFrameRef.current = requestAnimationFrame(captureAndDetect);
      return;
    }
    lastInferenceTimeRef.current = now;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    isInferringRef.current = true;
    const inferenceStart = performance.now();

    try {
      // Preprocess image
      const inputTensor = preprocessImageData(imageData, DEFAULT_YOLO_CONFIG.inputSize);
      
      // Create ONNX tensor
      const tensor = new ort.Tensor('float32', inputTensor, [
        1,
        3,
        DEFAULT_YOLO_CONFIG.inputSize,
        DEFAULT_YOLO_CONFIG.inputSize,
      ]);
      
      // Run inference
      const feeds = { images: tensor };
      const results = await session.run(feeds);
      
      // Get output tensor
      const outputTensor = results.output0;
      const outputData = outputTensor.data as Float32Array;
      
      // Post-process results
      const detections = processYOLOOutput(
        outputData,
        DEFAULT_YOLO_CONFIG.inputSize,
        canvas.width,
        canvas.height,
        DEFAULT_YOLO_CONFIG.confidenceThreshold,
        DEFAULT_YOLO_CONFIG.iouThreshold,
        FRUIT_VEGETABLE_CLASSES
      );
      
      const inferenceTime = performance.now() - inferenceStart;
      
      setDetections(detections);
      setInferenceTime(Math.round(inferenceTime));
      
      // Draw detections on canvas
      drawDetections(ctx, detections, canvas.width, canvas.height);
    } catch (error) {
      console.error('Detection error:', error);
    } finally {
      isInferringRef.current = false;
    }

    // Calculate FPS
    const fpsNow = performance.now();
    if (lastFrameTimeRef.current) {
      const delta = fpsNow - lastFrameTimeRef.current;
      const currentFps = 1000 / delta;
      fpsCounterRef.current.push(currentFps);
      
      if (fpsCounterRef.current.length > 30) {
        fpsCounterRef.current.shift();
      }
      
      const avgFps = fpsCounterRef.current.reduce((a, b) => a + b, 0) / fpsCounterRef.current.length;
      setFps(Math.round(avgFps));
    }
    lastFrameTimeRef.current = fpsNow;

    // Continue detection loop
    if (isDetecting) {
      animationFrameRef.current = requestAnimationFrame(captureAndDetect);
    }
  }, [isDetecting, targetFps, session]);

  // Add loading state to UI
  if (isModelLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading YOLO model...</p>
        </div>
      </div>
    );
  }

  if (modelError) {
    return (
      <div className="p-6 border rounded-lg bg-destructive/10 text-destructive">
        <h3 className="font-semibold mb-2">Model Loading Error</h3>
        <p>{modelError}</p>
      </div>
    );
  }

  // ... rest of component ...
}
```

## Performance Comparison

### Server-Side Inference (Current)
- **Total Latency**: 150-300ms
  - Network: 50-100ms
  - Server Processing: 100-200ms
- **Throughput**: 10 FPS max
- **Server Load**: High

### Client-Side Inference (Optimized)
- **Total Latency**: 50-150ms
  - Network: 0ms
  - Browser Processing: 50-150ms
- **Throughput**: 15-30 FPS
- **Server Load**: None

## Browser Compatibility

| Browser | WASM Support | WebGL Support | Performance |
|---------|-------------|---------------|-------------|
| Chrome 90+ | ✅ | ✅ | Excellent |
| Firefox 88+ | ✅ | ✅ | Good |
| Safari 15+ | ✅ | ✅ | Good |
| Edge 90+ | ✅ | ✅ | Excellent |

## GPU Acceleration (Advanced)

For even better performance, enable WebGL backend:

```typescript
const session = await ort.InferenceSession.create('/models/yolo11n.onnx', {
  executionProviders: ['webgl', 'wasm'], // Try WebGL first, fallback to WASM
  graphOptimizationLevel: 'all',
});
```

**Note**: WebGL support depends on browser and GPU availability.

## Troubleshooting

### Model Loading Issues
- Ensure model is in `public/models/` directory
- Check browser console for CORS errors
- Verify model file is not corrupted

### Performance Issues
- Reduce `inputSize` to 416 or 320 for faster inference
- Lower `targetFps` to reduce CPU load
- Check if WebGL is available: `ort.env.webgl.available`

### Memory Issues
- Clear detections periodically
- Limit FPS counter array size
- Release old tensors

## Migration Checklist

- [ ] Install `onnxruntime-web`
- [ ] Create `useYOLOSession` hook
- [ ] Create `clientPreprocessing.ts`
- [ ] Update `YOLODetector` component
- [ ] Test on multiple browsers
- [ ] Add loading states
- [ ] Add error handling
- [ ] Monitor performance metrics
- [ ] Update documentation

## Expected Results

After implementing client-side inference:
- **2-3x faster** inference
- **Zero server load** for inference
- **Better user experience** (no network delays)
- **Scales to unlimited users** (no server bottleneck)

## Next Steps

1. Implement the changes above
2. Test thoroughly on different devices
3. Consider removing server-side inference route
4. Add fallback to server-side if client-side fails
5. Monitor performance and adjust `inputSize` as needed
