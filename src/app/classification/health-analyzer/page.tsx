"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import DetectionPreview from "@/components/detection-preview";
import { RoboflowResponse } from "@/types";

function RoboflowOpenCVAnalyzer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<RoboflowResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [opencvLoaded, setOpencvLoaded] = useState(false);

  // Load OpenCV.js once
  useEffect(() => {
    if (window.cv) {
      setOpencvLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;
    script.onload = () => {
      console.log("✅ OpenCV.js loaded");
      setOpencvLoaded(true);
    };
    script.onerror = () => toast.error("Failed to load OpenCV.js");
    document.body.appendChild(script);
  }, []);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setResult(null);
  };

  // Send image to Roboflow
  const analyzeImage = async () => {
    if (!selectedFile) {
      toast.error("Please select an image first!");
      return;
    }
    setIsProcessing(true);
    toast.loading("Analyzing image...");

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);

      reader.onload = async () => {
        const base64Image = (reader.result as string).replace(
          /^data:image\/[a-z]+;base64,/,
          ""
        );

        const res = await axios({
          method: "POST",
          url: "https://serverless.roboflow.com/fruit-ripeness-unjex/2",
          params: {
            api_key: "GNiFfSbz1Wj9BGyzL221",
          },
          data: base64Image,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        setResult(res.data);
        toast.success("Image analyzed successfully!");
      };
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze image.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Fruit Ripeness Detector</CardTitle>
          <CardDescription>
            Upload an image and analyze the health of the fruit.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* File Input */}
          <input
            placeholder="Upload an image"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-sm border rounded-md p-2 cursor-pointer"
          />

          {/* Analyze Button */}
          <Button
            onClick={analyzeImage}
            disabled={!selectedFile || isProcessing || !opencvLoaded}
            className="w-full flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Analyze Image
              </>
            )}
          </Button>

          {/* Result JSON */}
          {result && (
            <pre className="mt-4 p-3 bg-muted rounded-md text-xs overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
          {selectedFile && result && (
            <DetectionPreview
              imageUrl={URL.createObjectURL(selectedFile!)}
              predictions={result?.predictions || []}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default RoboflowOpenCVAnalyzer;
