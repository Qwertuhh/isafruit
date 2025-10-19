import { NextRequest, NextResponse } from "next/server";
import * as ort from "onnxruntime-node";
import { processYOLOOutput } from "@/lib/yolo/postprocessing";
import {
  DEFAULT_YOLO_CONFIG,
  Detection,
  FRUIT_VEGETABLE_CLASSES,
  GPUInfo,
} from "@/lib/yolo/types";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { execSync } from "child_process";

let session: ort.InferenceSession | null = null;
let gpuInfo: GPUInfo | null = null;

/**
 * Detect NVIDIA GPU and CUDA availability
 */
function detectGPU(): GPUInfo {
  if (gpuInfo) return gpuInfo;

  try {
    const output = execSync(
      "nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits",
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      }
    );

    const lines = output.trim().split("\n");
    if (lines.length > 0 && lines[0]) {
      const [name, memoryMB] = lines[0].split(",").map((s) => s.trim());
      const memoryGB = parseFloat(memoryMB) / 1024;

      if (memoryGB >= 2 && memoryGB <= 4) {
        console.log(
          `✅ NVIDIA GPU detected: ${name} with ${memoryGB.toFixed(2)}GB memory`
        );
        gpuInfo = {
          available: true,
          name,
          memory: memoryGB,
          cudaAvailable: true,
          provider: "cuda",
        };
        return gpuInfo;
      } else if (memoryGB > 4) {
        console.log(
          `⚠️ NVIDIA GPU detected but memory exceeds 4GB limit: ${memoryGB.toFixed(
            2
          )}GB`
        );
      } else {
        console.log(
          `⚠️ NVIDIA GPU detected but insufficient memory: ${memoryGB.toFixed(
            2
          )}GB`
        );
      }
    }
  } catch (error) {
    console.log("ℹ️ No NVIDIA GPU detected or nvidia-smi not available");
  }

  gpuInfo = {
    available: false,
    cudaAvailable: false,
    provider: "cpu",
  };
  return gpuInfo;
}

/**
 * Get execution providers based on GPU availability
 */
function getExecutionProviders(): string[] {
  const gpu = detectGPU();

  if (gpu.cudaAvailable && gpu.provider === "cuda") {
    console.log("🚀 Using CUDA execution provider");
    return ["cuda", "cpu"];
  }

  console.log("💻 Using CPU execution provider");
  return ["cpu"];
}

/**
 * Initialize ONNX Runtime session with GPU support
 */
async function initializeSession(): Promise<ort.InferenceSession> {
  if (session) return session;

  const modelPath = path.join(
    process.cwd(),
    "public",
    "models",
    "yolo11n.onnx"
  );

  if (!fs.existsSync(modelPath)) {
    throw new Error(
      `Model not found at ${modelPath}. Please download YOLO11 model.`
    );
  }

  const executionProviders = getExecutionProviders();

  try {
    session = await ort.InferenceSession.create(modelPath, {
      executionProviders,
      graphOptimizationLevel: "all",
      enableCpuMemArena: true,
      enableMemPattern: true,
    });

    console.log("✅ YOLO11 model loaded successfully");
    console.log(
      `📊 Active execution provider: ${session.inputNames[0] || "unknown"}`
    );

    return session;
  } catch (error) {
    console.error(
      "Failed to create session with preferred providers, falling back to CPU"
    );

    session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ["cpu"],
      graphOptimizationLevel: "all",
    });

    console.log("✅ YOLO11 model loaded successfully (CPU fallback)");
    return session;
  }
}

/**
 * Preprocess image using sharp
 */
async function preprocessImageWithSharp(
  imageBuffer: Buffer,
  inputSize: number
): Promise<Float32Array> {
  // Resize and convert to RGB
  const { data } = await sharp(imageBuffer)
    .resize(inputSize, inputSize, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Convert to Float32Array and normalize [0, 255] -> [0, 1]
  const pixels = new Uint8Array(data);
  const float32Data = new Float32Array(3 * inputSize * inputSize);

  // Convert from HWC to CHW format (channels first)
  for (let i = 0; i < inputSize * inputSize; i++) {
    float32Data[i] = pixels[i * 3] / 255.0; // R
    float32Data[inputSize * inputSize + i] = pixels[i * 3 + 1] / 255.0; // G
    float32Data[2 * inputSize * inputSize + i] = pixels[i * 3 + 2] / 255.0; // B
  }

  return float32Data;
}

/**
 * Draw detections on image buffer using sharp
 */
async function drawDetectionsOnImage(
  imageBuffer: Buffer,
  detections: Array<{
    bbox: [number, number, number, number];
    class: string;
    confidence: number;
  }>,
  width: number,
  height: number
): Promise<Buffer> {
  // Create SVG overlay for bounding boxes
  const svgElements = detections
    .map((detection) => {
      const [x, y, w, h] = detection.bbox;
      const label = `${detection.class} ${(detection.confidence * 100).toFixed(
        1
      )}%`;

      // Calculate text dimensions (approximate)
      const textWidth = label.length * 8;
      const textHeight = 20;

      return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" 
            fill="none" stroke="#00ff00" stroke-width="3"/>
      <rect x="${x}" y="${y - textHeight - 4}" width="${
        textWidth + 8
      }" height="${textHeight + 4}" 
            fill="#00ff00"/>
      <text x="${x + 4}" y="${y - 8}" 
            font-family="Arial" font-size="16" fill="#000000">${label}</text>
    `;
    })
    .join("");

  const svg = `
    <svg width="${width}" height="${height}">
      ${svgElements}
    </svg>
  `;

  // Composite the SVG overlay onto the original image
  const annotatedImage = await sharp(imageBuffer)
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return annotatedImage;
}

/**
 * POST /api/photo-detect
 * Accepts base64 encoded image and returns YOLO11 detections + annotated image
 * Query param: usePython=true to use Python backend
 */
export async function POST(request: NextRequest) {
  // Check if Python backend should be used
  const usePython = request.nextUrl.searchParams.get("usePython") === "true";

  if (usePython) {
    try {
      const body = await request.json();
      const pythonUrl =
        process.env.PYTHON_PHOTO_DETECT_URL || "http://localhost:8002";

      const response = await fetch(`${pythonUrl}/photo-detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Python backend error: ${response.status}`);
      }

      const data = await response.json();

      // Transform Python response to match Node.js format
      const transformedDetections = data.detections.map((d: Detection) => ({
        bbox: d.bbox,
        class: d.class_name,
        confidence: d.confidence,
      }));

      return NextResponse.json({
        detections: transformedDetections,
        annotatedImage: data.annotatedImage,
        inferenceTime: data.inferenceTime,
        imageWidth: data.imageWidth,
        imageHeight: data.imageHeight,
      });
    } catch (error) {
      console.error("Python backend error:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Python backend failed",
        },
        { status: 500 }
      );
    }
  }

  // Use Node.js backend
  try {
    const startTime = Date.now();

    // Parse request body
    const body = await request.json();
    const { image, width, height } = body;

    if (!image || !width || !height) {
      return NextResponse.json(
        { error: "Missing required fields: image, width, height" },
        { status: 400 }
      );
    }

    // Decode base64 image
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Preprocess image with sharp
    const inputTensor = await preprocessImageWithSharp(
      imageBuffer,
      DEFAULT_YOLO_CONFIG.inputSize
    );

    // Initialize session
    const inferenceSession = await initializeSession();

    // Create ONNX tensor
    const tensor = new ort.Tensor("float32", inputTensor, [
      1,
      3,
      DEFAULT_YOLO_CONFIG.inputSize,
      DEFAULT_YOLO_CONFIG.inputSize,
    ]);

    // Run inference
    const feeds = { images: tensor };
    const results = await inferenceSession.run(feeds);

    // Get output tensor
    const outputTensor = results.output0;
    const outputData = outputTensor.data as Float32Array;

    // Post-process results
    const detections = processYOLOOutput(
      outputData,
      DEFAULT_YOLO_CONFIG.inputSize,
      width,
      height,
      DEFAULT_YOLO_CONFIG.confidenceThreshold,
      DEFAULT_YOLO_CONFIG.iouThreshold,
      FRUIT_VEGETABLE_CLASSES
    );

    // Draw detections on the image
    const annotatedImageBuffer = await drawDetectionsOnImage(
      imageBuffer,
      detections,
      width,
      height
    );
    const annotatedImageBase64 = `data:image/jpeg;base64,${annotatedImageBuffer.toString(
      "base64"
    )}`;

    const inferenceTime = Date.now() - startTime;

    return NextResponse.json({
      detections,
      annotatedImage: annotatedImageBase64,
      inferenceTime,
      imageWidth: width,
      imageHeight: height,
    });
  } catch (error) {
    console.error("Photo detection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Detection failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/photo-detect
 * Health check endpoint with GPU info
 * Query param: usePython=true to check Python backend
 */
export async function GET(request: NextRequest) {
  const usePython = request.nextUrl.searchParams.get("usePython") === "true";

  if (usePython) {
    try {
      const pythonUrl =
        process.env.PYTHON_PHOTO_DETECT_URL || "http://localhost:8002";
      const response = await fetch(`${pythonUrl}/photo-detect`);

      if (!response.ok) {
        throw new Error(`Python backend not available: ${response.status}`);
      }

      return NextResponse.json(await response.json());
    } catch (error) {
      return NextResponse.json(
        {
          status: "error",
          error: "Python backend not available",
          backend: "python",
        },
        { status: 503 }
      );
    }
  }

  // Use Node.js backend
  try {
    await initializeSession();
    const gpu = detectGPU();

    return NextResponse.json({
      status: "ready",
      model: "YOLO11n",
      gpu: {
        available: gpu.available,
        name: gpu.name,
        memory: gpu.memory,
        provider: gpu.provider,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
