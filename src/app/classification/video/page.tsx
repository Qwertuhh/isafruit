"use client";
import { YOLODetector } from "@/components/YOLODetector";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
function VideoDetectionPage() {
  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <CardTitle>Video Detection</CardTitle>
        <CardDescription>
          Detect objects in real-time using YOLOv11
        </CardDescription>
      </CardHeader>
      <YOLODetector />
    </Card>
  );
}

export default VideoDetectionPage;
