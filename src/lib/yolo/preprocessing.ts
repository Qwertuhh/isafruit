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
    .map(item => item.idx);
  
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
