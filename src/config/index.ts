import { YOLOConfig } from "../types";

const FRUIT_VEGETABLE_CLASSES = [
  "apple",
  "banana",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  "potted plant",
  "bottle",
  "wine glass",
  "cup",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "sandwich",
  "person",
  "chair",
];

const DEFAULT_YOLO_CONFIG: YOLOConfig = {
  modelPath: "/models/yolo11n.onnx",
  inputSize: 640,
  confidenceThreshold: 0.45,
  iouThreshold: 0.45,
  maxDetections: 100,
};

export { FRUIT_VEGETABLE_CLASSES, DEFAULT_YOLO_CONFIG };
