// Raw detection data from Python backend
interface RawDetection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class_name: string;
  confidence: number;
  class_id?: number; // Optional as it might not be present in the raw response
}

// Raw API response from Python backend
interface RawInferenceResponse {
  detections: RawDetection[];
  inferenceTime: number;
  annotatedImage?: string;
  imageWidth: number;
  imageHeight: number;
}

// Transformed detection data for frontend use
interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  confidence: number;
  classId: number;
}

// Transformed inference result for frontend use
interface InferenceResult {
  detections: Detection[];
  inferenceTime: number;
  imageWidth: number;
  imageHeight: number;
}

interface YOLOConfig {
  modelPath: string;
  inputSize: number;
  confidenceThreshold: number;
  iouThreshold: number;
  maxDetections: number;
}

interface GPUInfo {
  available: boolean;
  name?: string;
  memory?: number; // in GB
  cudaAvailable?: boolean;
  provider: "cuda" | "cpu";
}

interface VideoProcessingConfig {
  useOpenCV: boolean;
  targetFPS: number;
  batchSize: number;
  gpuAcceleration: boolean;
}

interface RoboflowDetection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RoboflowResponse {
  predictions?: RoboflowDetection[];
  time?: number;
  image?: {
    width: number;
    height: number;
  };
  // Add other properties as needed based on the actual API response
}
interface DeviceInfo {
  deviceId: string;
  label: string;
}

type EatibleStatus = "rotten" | "overriped" | "underriped" | "ripe";
export type {
  Detection,
  InferenceResult,
  YOLOConfig,
  GPUInfo,
  VideoProcessingConfig,
  RawInferenceResponse,
  RawDetection,
  RoboflowDetection,
  RoboflowResponse,
  DeviceInfo,
  EatibleStatus
};

export * from "@/types/store";
