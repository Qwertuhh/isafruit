"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Video,
  VideoOff,
  Camera,
  Loader2,
  Download,
  Upload,
  Bot,
  Heart,
  X,
  Speaker,
} from "lucide-react";
import { toast } from "sonner";
import DetectionPreview from "@/components/detection-preview";
import { EatibleStatus, RoboflowDetection, RoboflowResponse } from "@/types";
import Image from "next/image";
import { DeviceInfo } from "@/types";

const speak = (speechText: string) => {
  if (!("speechSynthesis" in window)) {
    toast.error("Speech synthesis not supported in this browser.");
    return;
  }
  if (!speechText) {
    console.error("No text to speak.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(speechText);
  speechSynthesis.speak(utterance);
};

function HealthAnalyzer() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [result, setResult] = useState<RoboflowResponse | null>(null);
  const [eatible, setEatible] = useState<boolean>(false);
  const [speech, setSpeech] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // === Fetch Camera Devices ===
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
      if (videoDevices.length && !selectedDevice)
        setSelectedDevice(videoDevices[0].deviceId);
    } catch (error) {
      toast.error("Unable to access camera. Please check permissions.");
      console.error("Error getting devices:", error);
    }
  }, [selectedDevice]);

  // === Start Stream ===
  const startStream = async () => {
    stopStream();
    if (!selectedDevice || !videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDevice } },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsStreamActive(true);
      setPreviewImage(null);
      setResult(null);
    } catch (error) {
      toast.error("Failed to start camera stream");
      console.error("Error starting stream:", error);
    }
  };

  // === Stop Stream ===
  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreamActive(false);
  };

  // === Handle Device Change ===
  useEffect(() => {
    if (selectedDevice) startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDevice]);

  // === Capture Photo from Webcam ===
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const base64Image = canvas.toDataURL("image/jpeg", 0.9);

    stopStream();
    setPreviewImage(base64Image);
    await analyzeImage(base64Image);
  };

  // === Handle File Upload ===
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopStream();
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imgData = event.target?.result as string;
      setPreviewImage(imgData);
      await analyzeImage(imgData);
    };
    reader.readAsDataURL(file);
  };

  // === Analyze Image via Roboflow ===
  const analyzeImage = async (base64Image: string) => {
    setIsProcessing(true);

    try {
      const cleanBase64 = base64Image.replace(
        /^data:image\/[a-z]+;base64,/,
        ""
      );

      const res = await axios({
        method: "POST",
        url: "https://serverless.roboflow.com/fruit-ripeness-unjex/2",
        params: {
          api_key: process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY,
        },
        data: cleanBase64,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const predictions: RoboflowDetection[] | null = res.data.predictions;
      if (!predictions){
        toast.error("No predictions found");
        return;
      };
      const fruitName = predictions[0].class.split(" ")[0];

      setResult(res.data);
      // Extract "rotten" or "fresh" from the class name
      //? UseEffect Does not react to changes in the result object
      const extractedEatibleStatus: EatibleStatus =
        res.data.predictions[0].class.split(" ")[1].toLowerCase();
      const eatible =
        extractedEatibleStatus === "rotten" ||
        extractedEatibleStatus === "overriped" ||
        extractedEatibleStatus === "underriped";
      setEatible(eatible);
      toast.success("Image analyzed successfully!");
      const speech = `This is a ${fruitName} and It is ${
        eatible ? "Eatible" : "Not Eatible"
      }`;
      setSpeech(speech);

      speak(speech);
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze image.");
    } finally {
      setIsProcessing(false);
    }
  };

  // === Capture Next ===
  const captureNext = async () => {
    setPreviewImage(null);
    setResult(null);
    setEatible(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    await startStream();
  };

  // === Init ===
  useEffect(() => {
    getVideoDevices();
    return () => stopStream();
  }, [getVideoDevices]);

  return (
    <CardContent className="space-y-4 mt-4">
      <CardDescription>
        Analyze the health of your fruits with our advanced AI-powered system.
      </CardDescription>
      <CardTitle className="text-2xl font-bold">
        {result?.predictions?.[0]?.class}
        {result && result.predictions && result.predictions.length > 0 && (
          <span className={eatible ? "text-red-500" : "text-green-500"}>
            {" "}
            {eatible ? <X className="inline" /> : <Heart className="inline" />}
          </span>
        )}
      </CardTitle>
      {/* === Preview Area === */}
      <div className="relative aspect-video bg-black rounded-md overflow-hidden">
        {previewImage ? (
          result ? (
            <DetectionPreview
              imageUrl={previewImage}
              predictions={result.predictions || []}
            />
          ) : (
            <Image
              width={500}
              height={500}
              src={previewImage}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          )
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
        )}

        {/* Loader Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white z-30">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>Analyzing...</p>
          </div>
        )}

        {/* Camera Off Overlay */}
        {!isStreamActive && !previewImage && !isProcessing && !result && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white z-20">
            <VideoOff className="w-12 h-12" />
          </div>
        )}

        {/* Camera Selector */}
        <div className="absolute bottom-2 left-2 z-40">
          <Select
            value={selectedDevice}
            onValueChange={setSelectedDevice}
            disabled={isProcessing || result !== null}
          >
            <SelectTrigger className="bg-black/60 text-white border-none">
              <SelectValue placeholder="Select Camera" />
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

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <CardDescription>
        {result
          ? `Detected ${result.predictions?.length || 0} object(s)`
          : previewImage
          ? "Analyzing or ready to analyze..."
          : "Start camera or upload an image"}
      </CardDescription>

      {/* === Controls === */}
      <div className="flex flex-col gap-2 py-4 px-1">
        {!result ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={isStreamActive ? stopStream : startStream}
              disabled={isProcessing}
            >
              {isStreamActive ? (
                <VideoOff className="w-4 h-4" />
              ) : (
                <Video className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload className="w-4 h-4" />
            </Button>
            <input
              placeholder="Upload Image"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileChange}
            />
            {!previewImage && (
              <Button
                className="flex-1 gap-2"
                onClick={capturePhoto}
                disabled={!isStreamActive || isProcessing}
              >
                <Bot className="w-4 h-4" />
                Capture & Analyze
              </Button>
            )}
          </div>
        ) : (
          <div className="flex gap-2 mb-4">
            <Button onClick={captureNext} variant="outline" className="flex-1">
              <Camera className="w-4 h-4 mr-2" />
              Capture Next
            </Button>
            <Button
              onClick={() => {
                const a = document.createElement("a");
                a.href = previewImage!;
                a.download = `detection_${Date.now()}.jpg`;
                a.click();
              }}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="icon" onClick={() => speak(speech)}>
              <Speaker />
            </Button>
          </div>
        )}
      </div>
    </CardContent>
  );
}

export default HealthAnalyzer;
