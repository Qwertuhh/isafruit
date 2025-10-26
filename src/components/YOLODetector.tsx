"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Zap, ZapOff, Cpu, Gpu } from "lucide-react";
import { Detection, GPUInfo } from "@/types";
import { drawDetections } from "@/lib/yolo/postprocessing";
import {
  preprocessFrameWithOpenCV,
  isOpenCVReady,
} from "@/lib/yolo/preprocessing";
import Script from "next/script";

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export function YOLODetector() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [fps, setFps] = useState(0);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [targetFps, setTargetFps] = useState(10);
  const [useOpenCV, setUseOpenCV] = useState(false);
  const [openCVLoaded, setOpenCVLoaded] = useState(false);
  const [gpuInfo, setGpuInfo] = useState<GPUInfo | null>(null);
  const [usePythonBackend, setUsePythonBackend] = useState(false);
  const [pythonBackendAvailable, setPythonBackendAvailable] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsCounterRef = useRef<number[]>([]);
  const isInferringRef = useRef<boolean>(false);
  const lastInferenceTimeRef = useRef<number>(0);

  // Check GPU availability on mount
  useEffect(() => {
    // Check Node.js backend
    fetch("/api/inference")
      .then((res) => res.json())
      .then((data) => {
        if (data.gpu) {
          setGpuInfo(data.gpu);
          if (data.gpu.available) {
            toast.success(`GPU Detected: ${data.gpu.name}`, {
              description: `Using ${data.gpu.provider.toUpperCase()} for acceleration`,
            });
          }
        }
      })
      .catch((err) => console.error("Failed to fetch GPU info:", err));

    // Check Python backend availability
    fetch("/api/inference?usePython=true")
      .then((res) => {
        if (res.ok) {
          setPythonBackendAvailable(true);
          return res.json();
        }
        throw new Error("Python backend not available");
      })
      .then((data) => {
        console.log("Python backend available:", data);
      })
      .catch((err) => {
        console.log("Python backend not available:", err.message);
        setPythonBackendAvailable(false);
      });
  }, []);

  // Handle OpenCV.js load
  const handleOpenCVLoad = useCallback(() => {
    setOpenCVLoaded(true);
    setUseOpenCV(true);
    toast.success("OpenCV.js loaded", {
      description: "Video processing will use hardware acceleration",
    });
  }, []);

  // Get available video devices
  const getVideoDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
        }));

      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  }, [selectedDevice]);

  // Start video stream
  const startStream = async () => {
    if (!selectedDevice || !videoRef.current) return;

    try {
      const constraints = {
        video: {
          deviceId: { exact: selectedDevice },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsStreamActive(true);
    } catch (err) {
      toast.error(`Error starting video stream`, {
        description:
          err instanceof Error ? err.message : "Please try again later.",
        duration: 5000,
      });
      console.error("Error starting video stream:", err);
    }
  };

  // Stop video stream
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreamActive(false);
    setIsDetecting(false);
  };

  // Capture frame and send for inference
  const captureAndDetect = useCallback(async () => {
    // Early return if detection is stopped
    if (!isDetecting) {
      isInferringRef.current = false;
      return;
    }

    if (!videoRef.current || !canvasRef.current) return;

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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame to canvas first
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let base64Image: string;

    // Try OpenCV.js preprocessing if enabled and available (only for Node.js backend)
    if (!usePythonBackend && useOpenCV && openCVLoaded && isOpenCVReady()) {
      try {
        // OpenCV.js processes frame directly from video element
        // This is faster than canvas-based approach
        const tensor = preprocessFrameWithOpenCV(video, 640);
        if (tensor) {
          // OpenCV preprocessing successful, but still use canvas image for API
          base64Image = canvas.toDataURL("image/jpeg", 0.5);
        } else {
          // Fallback to canvas method
          base64Image = canvas.toDataURL("image/jpeg", 0.5);
        }
      } catch (error) {
        console.error("OpenCV processing failed, using canvas:", error);
        base64Image = canvas.toDataURL("image/jpeg", 0.5);
      }
    } else {
      // Standard canvas-based preprocessing (already drawn above)
      base64Image = canvas.toDataURL("image/jpeg", 0.5);
    }

    isInferringRef.current = true;

    try {
      // Send to inference API (with backend selection)
      const apiUrl = usePythonBackend
        ? "/api/inference?usePython=true"
        : "/api/inference";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          width: canvas.width,
          height: canvas.height,
        }),
      });

      if (!response.ok) {
        console.error(`Inference API error: ${response.status}`);
        return;
      }

      const result = await response.json();

      if (result.detections) {
        setDetections(result.detections);
        setInferenceTime(result.inferenceTime);

        // Draw detections on canvas
        drawDetections(ctx, result.detections, canvas.width, canvas.height);
      }
    } catch (error) {
      console.error("Detection error:", error);
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

      const avgFps =
        fpsCounterRef.current.reduce((a, b) => a + b, 0) /
        fpsCounterRef.current.length;
      setFps(Math.round(avgFps));
    }
    lastFrameTimeRef.current = fpsNow;

    // Continue detection loop only if still detecting
    if (isDetecting) {
      animationFrameRef.current = requestAnimationFrame(captureAndDetect);
    } else {
      animationFrameRef.current = null;
    }
  }, [isDetecting, targetFps, useOpenCV, openCVLoaded, usePythonBackend]);

  // Start/stop detection
  const toggleDetection = () => {
    if (isDetecting) {
      setIsDetecting(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Reset inference state
      isInferringRef.current = false;
    } else {
      setIsDetecting(true);
    }
  };

  // Effect to start detection loop
  useEffect(() => {
    if (isDetecting && isStreamActive) {
      captureAndDetect();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDetecting, isStreamActive, captureAndDetect]);

  // Initialize devices
  useEffect(() => {
    getVideoDevices();
    return () => {
      stopStream();
    };
  }, [getVideoDevices]);

  // Handle device change
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId);
    if (isStreamActive) {
      stopStream();
      setTimeout(startStream, 100);
    }
  };

  return (
    <>
      {/* Load OpenCV.js */}
      <Script
        src="https://docs.opencv.org/4.x/opencv.js"
        onLoad={handleOpenCVLoad}
        onError={() => {
          console.error("Failed to load OpenCV.js");
          toast.error("OpenCV.js failed to load", {
            description: "Using standard processing",
          });
        }}
      />

      <div className="flex flex-col gap-4 p-6 rounded-lg bg-card">
        {/* Video and Canvas Container */}
        <div className="relative aspect-video bg-black rounded-md overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          {!isStreamActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              <VideoOff className="w-12 h-12" />
            </div>
          )}

          {/* Stats Overlay */}
          {isStreamActive && (
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-md text-sm font-mono space-y-1">
              <div className="flex items-center gap-2">
                {gpuInfo?.available ? (
                  <Gpu className="w-3 h-3 text-green-400" />
                ) : (
                  <Cpu className="w-3 h-3 text-blue-400" />
                )}
                <span>{gpuInfo?.provider.toUpperCase() || "CPU"}</span>
              </div>
              <div>
                FPS: {fps} / {targetFps}
              </div>
              <div>Inference: {inferenceTime}ms</div>
              <div>Detections: {detections.length}</div>
              {openCVLoaded && useOpenCV && (
                <div className="text-green-400">✓ OpenCV</div>
              )}
            </div>
          )}
        </div>

        {/* FPS Control */}
        <div className="flex items-center gap-4 px-2">
          <label className="text-sm font-medium">Target FPS:</label>
          <input
            placeholder="Target FPS"
            type="range"
            min="1"
            max="30"
            value={targetFps}
            onChange={(e) => setTargetFps(Number(e.target.value))}
            className="flex-1"
            disabled={!isStreamActive}
          />
          <span className="text-sm font-mono w-12">{targetFps}</span>
        </div>

        {/* Backend Toggle */}
        <div className="flex items-center gap-4 px-2">
          <label className="text-sm font-medium" htmlFor="usePython">
            Backend:
          </label>
          <div className="flex items-center gap-2">
            <input
              id="usePython"
              type="checkbox"
              checked={usePythonBackend}
              onChange={(e) => setUsePythonBackend(e.target.checked)}
              className="w-4 h-4"
              disabled={!pythonBackendAvailable || isDetecting}
            />
            <span className="text-sm font-medium">
              {usePythonBackend ? "Python (FastAPI)" : "Node.js (ONNX)"}
            </span>
          </div>
          {!pythonBackendAvailable && (
            <span className="text-xs text-yellow-600">
              Python backend not available
            </span>
          )}
          {pythonBackendAvailable && (
            <span className="text-xs text-green-600">
              ✓ Python backend ready
            </span>
          )}
        </div>

        {/* OpenCV Toggle */}
        {openCVLoaded && !usePythonBackend && (
          <div className="flex items-center gap-4 px-2">
            <label className="text-sm font-medium" htmlFor="useOpenCV">
              Use OpenCV.js:
            </label>
            <input
              id="useOpenCV"
              type="checkbox"
              checked={useOpenCV}
              onChange={(e) => setUseOpenCV(e.target.checked)}
              className="w-4 h-4"
              disabled={!isStreamActive}
            />
            <span className="text-xs text-muted-foreground">
              Hardware-accelerated frame processing
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          <Select
            value={selectedDevice}
            onValueChange={handleDeviceChange}
            disabled={isStreamActive}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a camera" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={isStreamActive ? stopStream : startStream}
            variant={isStreamActive ? "destructive" : "default"}
            className="gap-2"
          >
            {isStreamActive ? (
              <>
                <VideoOff className="w-4 h-4" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>Start</span>
              </>
            )}
          </Button>

          <Button
            onClick={toggleDetection}
            disabled={!isStreamActive}
            variant={isDetecting ? "secondary" : "default"}
            className="gap-2"
          >
            {isDetecting ? (
              <>
                <ZapOff className="w-4 h-4" />
                <span>Stop Detection</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Start Detection</span>
              </>
            )}
          </Button>
        </div>

        {/* Detection Results */}
        {detections.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">Detected Objects:</h3>
            <div className="flex flex-wrap gap-2">
              {detections.map((detection, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                >
                  {detection.class} ({(detection.confidence * 100).toFixed(1)}%)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
