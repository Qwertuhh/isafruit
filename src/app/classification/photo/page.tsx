"use client";
import {Card, CardHeader, CardTitle} from "@/components/ui/card";
import { PhotoCapture } from "@/components/PhotoCapture";
function PhotoDetectionPage() {
  return (
      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle>Photo Detection</CardTitle>
        </CardHeader>
        <PhotoCapture />
      </Card>
  );
}

export default PhotoDetectionPage;
