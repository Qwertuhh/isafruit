import type { CV } from "@techstark/opencv-js";
// OpenCV.js types (loaded dynamically)
declare const cv: CV;

/**
 * Check if OpenCV.js is loaded
 */
export function isOpenCVReady(): boolean {
  return typeof cv !== "undefined" && !!cv.Mat;
}

/**
 * Preprocess video frame using OpenCV.js for better performance
 * This is faster than canvas-based preprocessing for video streams
 */
export function preprocessFrameWithOpenCV(
  videoElement: HTMLVideoElement,
  inputSize: number
): Float32Array | null {
  if (!isOpenCVReady()) {
    console.warn("OpenCV.js not loaded, falling back to canvas preprocessing");
    return null;
  }

  // Check if video is ready
  if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
    console.warn("Video not ready for processing");
    return null;
  }

  try {
    // Create a temporary canvas to capture the video frame
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = videoElement.videoWidth;
    tempCanvas.height = videoElement.videoHeight;
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });

    if (!tempCtx) {
      console.error("Failed to get canvas context");
      return null;
    }

    // Draw video frame to canvas
    tempCtx.drawImage(videoElement, 0, 0);

    // Get image data from canvas
    const imageData = tempCtx.getImageData(
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );

    // Create OpenCV Mat from image data
    const src = cv.matFromImageData(imageData);

    // Convert RGBA to RGB
    const rgb = new cv.Mat();
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);

    // Resize to input size
    const resized = new cv.Mat();
    const dsize = new cv.Size(inputSize, inputSize);
    cv.resize(rgb, resized, dsize, 0, 0, cv.INTER_LINEAR);

    // Convert to Float32 and normalize [0, 255] -> [0, 1]
    const float32Mat = new cv.Mat();
    resized.convertTo(float32Mat, cv.CV_32F, 1.0 / 255.0);

    // Convert from HWC to CHW format (channels first)
    const channels = new cv.MatVector();
    cv.split(float32Mat, channels);

    const tensor = new Float32Array(3 * inputSize * inputSize);
    const channelSize = inputSize * inputSize;

    // Copy R, G, B channels
    for (let c = 0; c < 3; c++) {
      const channel = channels.get(c);
      const channelData = channel.data32F;
      tensor.set(channelData, c * channelSize);
      channel.delete();
    }

    // Cleanup
    src.delete();
    rgb.delete();
    resized.delete();
    float32Mat.delete();
    channels.delete();

    return tensor;
  } catch (error) {
    console.error("OpenCV preprocessing error:", error);
    return null;
  }
}

/**
 * Preprocess image for YOLO11 inference
 * Converts image to tensor format expected by ONNX Runtime
 */
export function preprocessImage(
  imageData: ImageData,
  inputSize: number
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

/**
 * Calculate IoU (Intersection over Union) between two boxes
 */
export function calculateIoU(
  box1: [number, number, number, number],
  box2: [number, number, number, number]
): number {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;

  const x1_max = x1 + w1;
  const y1_max = y1 + h1;
  const x2_max = x2 + w2;
  const y2_max = y2 + h2;

  const intersect_w = Math.max(0, Math.min(x1_max, x2_max) - Math.max(x1, x2));
  const intersect_h = Math.max(0, Math.min(y1_max, y2_max) - Math.max(y1, y2));
  const intersect_area = intersect_w * intersect_h;

  const box1_area = w1 * h1;
  const box2_area = w2 * h2;
  const union_area = box1_area + box2_area - intersect_area;

  return intersect_area / union_area;
}

/**
 * Non-Maximum Suppression to filter overlapping detections
 */
export function nonMaxSuppression(
  boxes: Array<[number, number, number, number]>,
  scores: number[],
  iouThreshold: number
): number[] {
  const indices: number[] = [];
  const sortedIndices = scores
    .map((score, idx) => ({ score, idx }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.idx);

  const suppressed = new Set<number>();

  for (const idx of sortedIndices) {
    if (suppressed.has(idx)) continue;

    indices.push(idx);

    for (const compareIdx of sortedIndices) {
      if (compareIdx === idx || suppressed.has(compareIdx)) continue;

      const iou = calculateIoU(boxes[idx], boxes[compareIdx]);
      if (iou > iouThreshold) {
        suppressed.add(compareIdx);
      }
    }
  }

  return indices;
}
