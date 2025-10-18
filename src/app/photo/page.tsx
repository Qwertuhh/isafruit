'use client';

import { PhotoCapture } from "@/components/PhotoCapture";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera } from "lucide-react";
import Link from "next/link";

export default function PhotoPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Live Detection</span>
            </Button>
          </Link>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Camera className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight">
                Photo Detection
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Capture a single photo and detect objects with YOLO11
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="px-2 py-1 bg-primary/10 rounded">Capture Photo</span>
              <span>→</span>
              <span className="px-2 py-1 bg-primary/10 rounded">YOLO11 Inference</span>
              <span>→</span>
              <span className="px-2 py-1 bg-primary/10 rounded">Annotated Image</span>
            </div>
          </div>
        </div>

        {/* Photo Capture Component */}
        <PhotoCapture />
      </div>
    </main>
  );
}
