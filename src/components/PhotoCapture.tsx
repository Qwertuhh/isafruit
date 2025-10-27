"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Video, VideoOff, Camera, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Detection } from "@/types";
import Image from "next/image";

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export function PhotoCapture() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [usePythonBackend, setUsePythonBackend] = useState(false);
  const [pythonBackendAvailable, setPythonBackendAvailable] = useState(false);
  const toastId = useRef<string | number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch available cameras
  const getVideoDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
        }));

      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDevice)
        setSelectedDevice(videoDevices[0].deviceId);
    } catch (err) {
      console.error("Error getting devices:", err);
    }
  }, [selectedDevice]);

  // Start stream
  const startStream = async () => {
    if (!selectedDevice || !videoRef.current) return false;
    
    // Stop any existing stream first
    stopStream();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedDevice },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      // Set the new stream
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      
      // Wait for the video to be ready
      await new Promise((resolve, reject) => {
        if (!videoRef.current) return reject('Video ref not available');
        
        const onLoaded = () => {
          videoRef.current?.removeEventListener('loadedmetadata', onLoaded);
          resolve(true);
        };
        
        videoRef.current.addEventListener('loadedmetadata', onLoaded);
        videoRef.current.play().catch(reject);
      });
      
      setIsStreamActive(true);
      return true;
    } catch (err) {
      console.error("Error starting stream:", err);
      toast.error("Failed to start video stream. Please check camera permissions.");
      return false;
    }
  };

  // Stop stream
  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreamActive(false);
  };

  // Capture and detect
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL("image/jpeg", 0.9);

      toastId.current = toast.loading("Processing image...");
      setIsProcessing(true);

      const apiUrl = usePythonBackend
        ? "/api/photo-detect?usePython=true"
        : "/api/photo-detect";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          width: canvas.width,
          height: canvas.height,
        }),
      });

      const result = await res.json();

      if (result.detections) {
        setDetections(result.detections);
        setAnnotatedImage(result.annotatedImage);
        setInferenceTime(result.inferenceTime);
        toast.success(
          `Detected object(s) in ${result.inferenceTime}ms`,
          { id: toastId.current }
        );
      }

      // Replace live video with image
      stopStream();
    } catch (error) {
      toast.error("Detection failed.", { id: toastId.current });
      console.error("Detection failed:", error);
    } finally {
      setIsProcessing(false);
      toastId.current = 0;
    }
  };

  // Resume camera for next capture
  const captureNext = async () => {
    setAnnotatedImage(null);
    setDetections([]);
    // Ensure we have a small delay to allow state to update before restarting stream
    await new Promise(resolve => setTimeout(resolve, 100));
    await startStream();
  };

  // Initialize
  useEffect(() => {
    getVideoDevices();
    return () => stopStream();
  }, [getVideoDevices]);

  // Check Python backend
  useEffect(() => {
    fetch("/api/photo-detect?usePython=true")
      .then((r) => {
        if (r.ok) setPythonBackendAvailable(true);
      })
      .catch(() => setPythonBackendAvailable(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photo Detection</CardTitle>
        <CardDescription>
          {annotatedImage
            ? `Found ${detections.length} object(s) in ${inferenceTime}ms`
            : "Start your camera and capture a photo"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Backend toggle */}
        <div className="flex items-center gap-4 px-2 py-2 bg-muted/50 rounded-md">
          <label className="text-sm font-medium" htmlFor="usePythonPhoto">
            Backend:
          </label>
          <div className="flex items-center gap-2">
            <input
              id="usePythonPhoto"
              type="checkbox"
              checked={usePythonBackend}
              onChange={(e) => setUsePythonBackend(e.target.checked)}
              className="w-4 h-4"
              disabled={!pythonBackendAvailable || isProcessing}
            />
            <span className="text-sm font-medium">
              {usePythonBackend ? "Python (FastAPI)" : "Node.js (ONNX)"}
            </span>
          </div>
        </div>

        {/* Preview area */}
        <div className="relative aspect-video bg-black rounded-md overflow-hidden">
          {annotatedImage ? (
            <Image
              src={annotatedImage}
              alt="Detected"
              className="w-full h-full object-contain"
              width={1280}
              height={720}
              unoptimized
            />
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
          {!isStreamActive && !annotatedImage && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              <VideoOff className="w-12 h-12" />
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
              <Loader2 className="w-10 h-10 animate-spin mb-2" />
              <p className="text-sm">Analyzing...</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2">
          <Select
            value={selectedDevice}
            onValueChange={(id) => setSelectedDevice(id)}
            disabled={isStreamActive || annotatedImage !== null}
          >
            <SelectTrigger>
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

          <div className="flex gap-2">
            {!annotatedImage ? (
              <>
                <Button
                  onClick={isStreamActive ? stopStream : startStream}
                  variant={isStreamActive ? "destructive" : "default"}
                  className="flex-1 gap-2"
                >
                  {isStreamActive ? (
                    <>
                      <VideoOff className="w-4 h-4" />
                      <span>Stop Camera</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      <span>Start Camera</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={capturePhoto}
                  disabled={!isStreamActive || isProcessing}
                  className="flex-1 gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isProcessing ? "Capturing..." : "Capture Photo"}</span>
                </Button>
              </>
            ) : (
              <Button onClick={captureNext} className="w-full gap-2">
                <Camera className="w-4 h-4" />
                <span>Capture Next</span>
              </Button>
            )}
          </div>
        </div>

        {/* Detection list (overlay under image) */}
        {detections.length > 0 && annotatedImage && (
          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold mb-2">Detected Objects:</h3>
            <div className="space-y-1">
              {detections.map((d, i) => (
                <div
                  key={i}
                  className="flex justify-between bg-muted p-2 rounded-md"
                >
                  <span className="font-medium">{d.class}</span>
                  <span className="text-sm text-muted-foreground">
                    {(d.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            <Button
              onClick={() => {
                const a = document.createElement("a");
                a.href = annotatedImage;
                a.download = `detection_${Date.now()}.jpg`;
                a.click();
              }}
              variant="outline"
              className="mt-3 w-full gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Annotated Image</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
