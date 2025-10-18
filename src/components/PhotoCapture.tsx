'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, VideoOff, Camera, Loader2, Download } from 'lucide-react';
import { Detection } from '@/lib/yolo/types';
import Image from 'next/image';

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export function PhotoCapture() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [inferenceTime, setInferenceTime] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get available video devices
  const getVideoDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
        }));
      
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
    }
  }, [selectedDevice]);

  // Start video stream
  const startStream = async () => {
    if (!selectedDevice || !videoRef.current) return;

    try {
      const constraints = {
        video: { 
          deviceId: { exact: selectedDevice },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsStreamActive(true);
      
      // Clear previous results when starting new stream
      setAnnotatedImage(null);
      setDetections([]);
    } catch (err) {
      console.error('Error starting video stream:', err);
    }
  };

  // Stop video stream
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreamActive(false);
  };

  // Capture photo and send for detection
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !isStreamActive) return;

    setIsProcessing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get base64 image
      const base64Image = canvas.toDataURL('image/jpeg', 0.9);

      // Send to detection API
      const response = await fetch('/api/photo-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          width: canvas.width,
          height: canvas.height,
        }),
      });

      const result = await response.json();
      
      if (result.detections) {
        setDetections(result.detections);
        setAnnotatedImage(result.annotatedImage);
        setInferenceTime(result.inferenceTime);
      }
    } catch (error) {
      console.error('Capture and detection error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download annotated image
  const downloadImage = () => {
    if (!annotatedImage) return;
    
    const link = document.createElement('a');
    link.href = annotatedImage;
    link.download = `detection_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Camera Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Camera Preview</CardTitle>
          <CardDescription>Select a camera and capture a photo for detection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Preview */}
          <div className="relative aspect-video bg-black rounded-md overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            {!isStreamActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <VideoOff className="w-12 h-12" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2">
            <Select
              value={selectedDevice}
              onValueChange={handleDeviceChange}
              disabled={isStreamActive}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a camera" />
              </SelectTrigger>
              <SelectContent>
                {devices.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                onClick={isStreamActive ? stopStream : startStream}
                variant={isStreamActive ? 'destructive' : 'default'}
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
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Capture Photo</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detection Results Card */}
      <Card>
        <CardHeader>
          <CardTitle>Detection Results</CardTitle>
          <CardDescription>
            {annotatedImage 
              ? `Found ${detections.length} object(s) in ${inferenceTime}ms`
              : 'Capture a photo to see detection results'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Annotated Image */}
          <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
            {annotatedImage ? (
              <Image
                src={annotatedImage}
                alt="Detected objects"
                className="w-full h-full object-contain"
                width={1280}
                height={720}
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No detection yet</p>
                </div>
              </div>
            )}
          </div>

          {/* Download Button */}
          {annotatedImage && (
            <Button
              onClick={downloadImage}
              variant="outline"
              className="w-full gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Annotated Image</span>
            </Button>
          )}

          {/* Detection List */}
          {detections.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Detected Objects:</h3>
              <div className="space-y-2">
                {detections.map((detection, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-muted rounded-md"
                  >
                    <span className="font-medium">{detection.class}</span>
                    <span className="text-sm text-muted-foreground">
                      {(detection.confidence * 100).toFixed(1)}% confidence
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
