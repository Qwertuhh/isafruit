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
import { Video, VideoOff } from 'lucide-react';

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export function WebcamSelector() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isStreamActive, setIsStreamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
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

  // Start or stop video stream
  const toggleStream = async () => {
    if (isStreamActive) {
      stopStream();
    } else {
      await startStream();
    }
  };

  // Start video stream with selected device
  const startStream = async () => {
    if (!selectedDevice || !videoRef.current) return;

    try {
      const constraints = {
        video: { deviceId: { exact: selectedDevice } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsStreamActive(true);
    } catch (err) {
      console.error('Error starting video stream:', err);
    }
  };

  // Stop the current video stream
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

  // Clean up on unmount
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
      // Start new stream with the selected device
      setTimeout(startStream, 100);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <div className="relative aspect-video bg-black rounded-md overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {!isStreamActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            <VideoOff className="w-12 h-12" />
          </div>
        )}
      </div>

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
            {devices.map(device => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={toggleStream}
          variant={isStreamActive ? 'destructive' : 'default'}
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
      </div>
    </div>
  );
}
