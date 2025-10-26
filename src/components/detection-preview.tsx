import { useEffect, useRef } from "react";
import { RoboflowDetection } from "@/types";

function DetectionPreview({
  imageUrl,
  predictions,
}: {
  imageUrl: string;
  predictions: RoboflowDetection[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!img || !canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleImageLoad = () => {
      // Set canvas dimensions to match the displayed image size
      const containerWidth = container.clientWidth;
      const scale = containerWidth / img.naturalWidth;
      const displayHeight = img.naturalHeight * scale;
      
      canvas.width = containerWidth;
      canvas.height = displayHeight;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw predictions
      predictions.forEach((p) => {
        // Scale the bounding box coordinates
        const x = (p.x - p.width / 2) * scale;
        const y = (p.y - p.height / 2) * scale;
        const width = p.width * scale;
        const height = p.height * scale;
        
        // Draw bounding box
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Draw semi-transparent fill
        ctx.fillStyle = "rgba(0,255,0,0.15)";
        ctx.fillRect(x, y, width, height);

        // Draw label background
        const label = `${p.class} ${(p.confidence * 100).toFixed(1)}%`;
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width + 8;
        const textHeight = 4;
        
        ctx.fillStyle = "lime";
        ctx.fillRect(x-1, y + textHeight-4, textWidth*3/2, textHeight+14);

        // Draw text
        ctx.fillStyle = "black";
        ctx.font = "12px jetbrains mono, monospace";
        ctx.textBaseline = "top";
        ctx.fillText(label, x +2, y + textHeight );
      });
    };

    img.onload = handleImageLoad;
    
    // Handle window resize
    const handleResize = () => {
      if (img.complete) {
        handleImageLoad();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial render
    if (img.complete) {
      handleImageLoad();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [predictions]);

  return (
    <div ref={containerRef} className="relative w-full">
      <img 
        ref={imgRef} 
        src={imageUrl} 
        alt="Detection preview" 
        className="hidden" 
        onLoad={(e) => {
          // Force re-render when image loads
          if (canvasRef.current) {
            const event = new Event('resize');
            window.dispatchEvent(event);
          }
        }}
      />
      <canvas 
        ref={canvasRef} 
        className="w-full h-auto border rounded" 
      />
    </div>
  );
}

export default DetectionPreview;
