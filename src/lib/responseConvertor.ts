import { Detection, InferenceResult, RawDetection, RawInferenceResponse } from "@/types";

// Function to transform raw detection data to frontend format
function transformDetection(detection: RawDetection): Detection {
  return {
    bbox: detection.bbox,
    class: detection.class_name,
    confidence: detection.confidence,
    classId: detection.class_id ?? -1, // Default to -1 if class_id is not provided
  };
}

// Function to transform the entire API response
function transformInferenceResponse(
  response: RawInferenceResponse
): InferenceResult {
  return {
    detections: response.detections.map(transformDetection),
    inferenceTime: response.inferenceTime,
    imageWidth: response.imageWidth,
    imageHeight: response.imageHeight,
  };
}

export { transformDetection, transformInferenceResponse };
