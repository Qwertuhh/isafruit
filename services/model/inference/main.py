from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import cv2
import numpy as np
from ultralytics import YOLO
import base64
from io import BytesIO
from PIL import Image
import time
from typing import List, Dict, Optional
import subprocess

app = FastAPI(title="YOLO Inference Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
model: Optional[YOLO] = None
gpu_info: Optional[Dict] = None


class InferenceRequest(BaseModel):
    image: str  # base64 encoded image
    width: int
    height: int


class Detection(BaseModel):
    bbox: List[float]
    class_name: str = "unknown"
    confidence: float


class InferenceResponse(BaseModel):
    detections: List[Detection]
    inferenceTime: int
    imageWidth: int
    imageHeight: int


class GPUInfoResponse(BaseModel):
    status: str
    model: str
    gpu: Dict


def detect_gpu() -> Dict:
    """Detect NVIDIA GPU and CUDA availability"""
    global gpu_info
    if gpu_info:
        return gpu_info

    try:
        # Check if CUDA is available
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            
            print(f"✅ NVIDIA GPU detected: {gpu_name} with {gpu_memory:.2f}GB memory")
            print(f"🚀 CUDA Version: {torch.version.cuda}")
            
            gpu_info = {
                "available": True,
                "name": gpu_name,
                "memory": round(gpu_memory, 2),
                "cudaAvailable": True,
                "provider": "cuda",
            }
            return gpu_info
    except Exception as e:
        print(f"⚠️ Error detecting GPU: {e}")

    # Fallback to CPU
    print("💻 Using CPU for inference")
    gpu_info = {
        "available": False,
        "cudaAvailable": False,
        "provider": "cpu",
    }
    return gpu_info


def initialize_model():
    """Initialize YOLO model with GPU support"""
    global model
    if model:
        return model

    try:
        # Load YOLO11n model
        model_path = "../../../public/models/yolo11n.pt"
        print(f"Loading YOLO model from {model_path}...")
        
        model = YOLO(model_path)
        
        # Set device based on GPU availability
        gpu = detect_gpu()
        if gpu["cudaAvailable"]:
            model.to("cuda")
            print("✅ Model loaded on GPU")
        else:
            model.to("cpu")
            print("✅ Model loaded on CPU")
        
        return model
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")


def preprocess_image(base64_image: str) -> np.ndarray:
    """Preprocess base64 image for YOLO inference using OpenCV for speed"""
    try:
        # Decode base64 image
        if "," in base64_image:
            base64_image = base64_image.split(",")[1]
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_image)
        
        # Use cv2 for faster decoding
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_array = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img_array is None:
            raise ValueError("Failed to decode image")
        
        # Convert BGR to RGB (cv2 loads as BGR)
        img_array = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
        
        return img_array
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to preprocess image: {str(e)}")


@app.post("/inference", response_model=InferenceResponse)
async def inference(request: InferenceRequest):
    """Run YOLO inference on image"""
    try:
        start_time = time.time()
        
        # Initialize model if not already loaded
        if model is None:
            initialize_model()
        
        # Preprocess image
        img_array = preprocess_image(request.image)
        
        # Run inference
        results = model(img_array, conf=0.25, iou=0.45, verbose=False)
        
        # Process detections
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get box coordinates (xyxy format)
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                
                # Convert to xywh format
                x = float(x1)
                y = float(y1)
                w = float(x2 - x1)
                h = float(y2 - y1)
                
                # Get class and confidence
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                class_name = result.names[cls] if cls < len(result.names) else "unknown"
                
                detections.append(
                    Detection(
                        bbox=[x, y, w, h],
                        class_name=class_name,
                        confidence=conf,
                    )
                )
        
        inference_time = int((time.time() - start_time) * 1000)
        
        return InferenceResponse(
            detections=detections,
            inferenceTime=inference_time,
            imageWidth=request.width,
            imageHeight=request.height,
        )
    except Exception as e:
        print(f"❌ Inference error: {e}")
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")


@app.get("/inference", response_model=GPUInfoResponse)
async def health_check():
    """Health check endpoint with GPU info"""
    try:
        # Initialize model to ensure it's loaded
        if model is None:
            initialize_model()
        
        gpu = detect_gpu()
        
        return GPUInfoResponse(
            status="ready",
            model="YOLO11n",
            gpu=gpu,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "YOLO Inference Service", "status": "running"}


if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting YOLO Inference Service...")
    print("Initializing model and warming up...")
    detect_gpu()
    initialize_model()
    
    # Warm up model with dummy inference
    try:
        dummy_img = np.zeros((640, 640, 3), dtype=np.uint8)
        model(dummy_img, verbose=False)
        print("✅ Model warmed up and ready")
    except Exception as e:
        print(f"⚠️ Model warmup failed: {e}")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)
