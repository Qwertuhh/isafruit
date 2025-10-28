"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useServerStore } from "@/stores/serverStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription } from "@/components/ui/card";
import {
  Video,
  VideoOff,
  Camera,
  Loader2,
  Download,
  Upload,
  Settings as SettingsIcon,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { Detection } from "@/types";
import Image from "next/image";
import { BackendType } from "@/types/store";
import Settings from "@/components/layout/settings";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentBackend } = useServerStore();
  const usePython = currentBackend === BackendType.PYTHON;

  const toastId = useRef<string | number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentBackendRef = useRef<BackendType>(currentBackend);

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
        if (!videoRef.current) return reject("Video ref not available");

        const onLoaded = () => {
          videoRef.current?.removeEventListener("loadedmetadata", onLoaded);
          resolve(true);
        };

        videoRef.current.addEventListener("loadedmetadata", onLoaded);
        videoRef.current.play().catch(reject);
      });

      setIsStreamActive(true);
      return true;
    } catch (err) {
      console.error("Error starting stream:", err);
      toast.error(
        "Failed to start video stream. Please check camera permissions."
      );
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

  // Handle file selection
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.match("image/jpeg") && !file.type.match("image/png")) {
      toast.error("Please select a valid image file (JPEG or PNG)");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target?.result as string;
      if (base64Image) {
        await processImage(base64Image);
      }
    };
    reader.readAsDataURL(file);
  };

  // Process the captured or uploaded image
  const processImage = async (base64Image: string) => {
    if (!base64Image) {
      console.error("No image data provided to processImage");
      return;
    }
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.src = base64Image;

    await new Promise<void>((resolve) => {
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve();
      };
    });

    toastId.current = toast.loading("Processing image...");
    setIsProcessing(true);

    try {
      const apiUrl = usePython
        ? "/api/photo-detect?usePython=true"
        : "/api/photo-detect";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: canvas.toDataURL("image/jpeg", 0.9),
          width: canvas.width,
          height: canvas.height,
        }),
      });

      const result = await res.json();

      if (result.detections) {
        setDetections(result.detections);
        setAnnotatedImage(result.annotatedImage);
        setInferenceTime(result.inferenceTime);
        toast.success(`Detected object(s) in ${result.inferenceTime}ms`, {
          id: toastId.current,
        });
      }
    } catch (error) {
      toast.error("Detection failed.", { id: toastId.current });
      console.error("Detection failed:", error);
    } finally {
      setIsProcessing(false);
      toastId.current = 0;
    }
  };

  // Capture and detect from camera
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

      const apiUrl = usePython
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
        toast.success(`Detected object(s) in ${result.inferenceTime}ms`, {
          id: toastId.current,
        });
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
    await new Promise((resolve) => setTimeout(resolve, 100));
    await startStream();
  };

  useEffect(() => {
    if (!annotatedImage && !isStreamActive) return;

    toast.info(`Backend changed to ${currentBackend}`, {
      description: "Reinitializing camera for the new backend...",
    });

    // Reset detections and images
    setAnnotatedImage(null);
    setDetections([]);

    // Restart stream if it was active before backend switch
    if (isStreamActive) {
      stopStream();
      setTimeout(startStream, 300);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBackend]);

  // Initialize
  useEffect(() => {
    getVideoDevices();
    return () => {
      stopStream();
      if (toastId.current) {
        toast.dismiss(toastId.current);
        toastId.current = 0;
      }
    };
  }, [getVideoDevices]);

  // Initial backend check is now handled by serverStore

  return (
    <CardContent className="space-y-4 h">
      {/* Preview area */}
      <div className="relative aspect-video  bg-black rounded-md overflow-hidden">
        <div className="absolute flex flex-row gap-2 top-2 right-2 z-10 text-white p-1">
          <Tooltip>
            <TooltipTrigger>
              <div className="border-2 border-white rounded p-1">
                <Image
                  src={
                    currentBackend === BackendType.PYTHON
                      ? "/python.svg"
                      : "/nodejs.svg"
                  }
                  alt="Logo"
                  width={32}
                  height={32}
                  className="rounded-full w-4 h-4"
                  style={{
                    filter: "invert(1)",
                  }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent >
              <p>{currentBackend}</p>
            </TooltipContent>
          </Tooltip>
          <Settings currentBackendRef={currentBackendRef} >
            <SettingsIcon className="h-4 w-4 m-1" />
          </Settings>
        </div>

        {/* Device selector */}
        <div className="absolute bottom-2 left-2 z-10 text-white rounded-md border-none">
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
        </div>
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
      <CardDescription>
        {annotatedImage
          ? `Found ${detections.length} object(s) in ${inferenceTime}ms`
          : "Start your camera and capture a photo"}
      </CardDescription>

      {/* Controls */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {annotatedImage ? (
            <div className="flex gap-2 w-full">
              <Button
                onClick={captureNext}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Next</span>
              </Button>
              <Button
                onClick={capturePhoto}
                disabled={isProcessing}
                className="flex-1 gap-2"
              >
                <Bot className="w-4 h-4" />
                <span>Analyze Again</span>
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={isStreamActive ? stopStream : startStream}
                disabled={isProcessing}
                title={isStreamActive ? "Stop Camera" : "Start Camera"}
              >
                {isStreamActive ? (
                  <VideoOff className="h-4 w-4" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {isStreamActive ? "Stop Camera" : "Start Camera"}
                </span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                title="Upload from device"
              >
                <Upload className="h-4 w-4" />
                <span className="sr-only">Upload from device</span>
              </Button>
              <input
                placeholder="Upload an image"
                type="file"
                ref={fileInputRef}
                accept="image/jpeg, image/png"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                onClick={capturePhoto}
                disabled={!isStreamActive || isProcessing}
                className="flex-1 gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>
                  {isProcessing ? "Capturing..." : "Capture & Analyze"}
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Detection list (overlay under image) */}
      {detections.length > 0 && annotatedImage && (
        <div className="border pt-3">
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
  );
}
