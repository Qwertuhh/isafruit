export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  confidence: number;
  classId: number;
}

export interface InferenceResult {
  detections: Detection[];
  inferenceTime: number;
  imageWidth: number;
  imageHeight: number;
}

export interface YOLOConfig {
  modelPath: string;
  inputSize: number;
  confidenceThreshold: number;
  iouThreshold: number;
  maxDetections: number;
}

export const FRUIT_VEGETABLE_CLASSES = [
  'apple', 'banana', 'orange', 'broccoli', 'carrot',
  'hot dog', 'pizza', 'donut', 'cake', 'potted plant',
  'bottle', 'wine glass', 'cup', 'fork', 'knife',
  'spoon', 'bowl', 'sandwich', 'person', 'chair'
];

export const DEFAULT_YOLO_CONFIG: YOLOConfig = {
  modelPath: '/models/yolo11n.onnx',
  inputSize: 640,
  confidenceThreshold: 0.45,
  iouThreshold: 0.45,
  maxDetections: 100,
};
