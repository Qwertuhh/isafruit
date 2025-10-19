import { Detection } from "../../types";
import { nonMaxSuppression } from "./preprocessing";

/**
 * Process YOLO11 output tensor to extract detections
 * YOLO11 output format: [1, 84, 8400] where 84 = 4 bbox coords + 80 class scores
 */
export function processYOLOOutput(
  output: Float32Array,
  inputSize: number,
  originalWidth: number,
  originalHeight: number,
  confidenceThreshold: number,
  iouThreshold: number,
  classNames: string[]
): Detection[] {
  const numClasses = 80;
  const numDetections = 8400;

  const boxes: Array<[number, number, number, number]> = [];
  const scores: number[] = [];
  const classIds: number[] = [];

  // Parse detections
  for (let i = 0; i < numDetections; i++) {
    // Get class scores (skip first 4 bbox values)
    let maxScore = 0;
    let maxClassId = 0;

    for (let c = 0; c < numClasses; c++) {
      const score = output[i + (4 + c) * numDetections];
      if (score > maxScore) {
        maxScore = score;
        maxClassId = c;
      }
    }

    // Filter by confidence threshold
    if (maxScore < confidenceThreshold) continue;

    // Extract bbox coordinates (center_x, center_y, width, height)
    const cx = output[i];
    const cy = output[i + numDetections];
    const w = output[i + 2 * numDetections];
    const h = output[i + 3 * numDetections];

    // Convert to corner format and scale to original image size
    const scaleX = originalWidth / inputSize;
    const scaleY = originalHeight / inputSize;

    const x = (cx - w / 2) * scaleX;
    const y = (cy - h / 2) * scaleY;
    const width = w * scaleX;
    const height = h * scaleY;

    boxes.push([x, y, width, height]);
    scores.push(maxScore);
    classIds.push(maxClassId);
  }

  // Apply Non-Maximum Suppression
  const keepIndices = nonMaxSuppression(boxes, scores, iouThreshold);

  // Build final detections
  const detections: Detection[] = keepIndices.map((idx) => ({
    bbox: boxes[idx],
    class: classNames[classIds[idx]] || `class_${classIds[idx]}`,
    confidence: scores[idx],
    classId: classIds[idx],
  }));

  return detections;
}

/**
 * Draw detections on canvas
 */
export function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: Detection[],
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);

  detections.forEach((detection) => {
    const [x, y, w, h] = detection.bbox;

    // Draw bounding box
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Draw label background
    const label = `${detection.class} ${(detection.confidence * 100).toFixed(
      1
    )}%`;
    ctx.font = "16px Arial";
    const textMetrics = ctx.measureText(label);
    const textHeight = 20;

    ctx.fillStyle = "#00ff00";
    ctx.fillRect(x, y - textHeight - 4, textMetrics.width + 8, textHeight + 4);

    // Draw label text
    ctx.fillStyle = "#000000";
    ctx.fillText(label, x + 4, y - 8);
  });
}
