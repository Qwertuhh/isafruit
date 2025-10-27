"use client";

import { PhotoCapture } from "@/components/PhotoCapture";
function PhotoDetectionPage() {
  return (
    <div>
      <Card className="border-none shadow-none">
            <CardHeader>
              <CardTitle>Photo Detection</CardTitle>
            </CardHeader>
      <PhotoCapture />
      
    </div>
  );
}

export default PhotoDetectionPage;
