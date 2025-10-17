'use client';
import { YOLODetector } from "@/components/YOLODetector";

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            YOLO11 Fruit & Vegetable Detection
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time object detection with WebRTC streaming
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="px-2 py-1 bg-primary/10 rounded">Webcam Capture</span>
            <span>→</span>
            <span className="px-2 py-1 bg-primary/10 rounded">YOLO11 Inference</span>
            <span>→</span>
            <span className="px-2 py-1 bg-primary/10 rounded">Annotated Results</span>
          </div>
        </div>
        <YOLODetector />
      </div>
    </main>
  );
}
