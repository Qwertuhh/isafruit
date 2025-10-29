"use client";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/layout/logo";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-background">
        <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] px-4 py-8 sm:py-12 md:py-16">
          <div className="w-full max-w-3xl text-center space-y-6 sm:space-y-8 animate-fade-in px-2">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-center">
                <Logo
                  size={100}
                  className="drop-shadow-md sm:size-28 md:size-32"
                />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent font-display">
                Fruit & Vegetable Detector
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-sans leading-relaxed px-2">
                Real-time fruit & vegetable classification and health analyzer
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4 justify-center pt-2 sm:pt-4 w-full max-w-md mx-auto">
              <Link
                href="/classification/photo"
                className="w-full sm:w-auto flex-1 sm:flex-none"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 group transition-all duration-200 hover:scale-105 text-sm sm:text-base"
                >
                  <span>Capture Photo</span>
                </Button>
              </Link>
              <Link
                href="/classification/video"
                className="w-full sm:w-auto flex-1 sm:flex-none"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 group transition-all duration-200 hover:scale-105 text-sm sm:text-base"
                >
                  <span>Video Detection</span>
                </Button>
              </Link>
              <Link href="/classification/health-analyzer" className="w-full">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 group transition-all duration-200 hover:scale-105 text-sm sm:text-base"
                >
                  <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                  <span>Health Analyzer</span>
                </Button>
              </Link>
            </div>

            <div className="pt-6 sm:pt-8 text-xs sm:text-sm text-muted-foreground">
              <p>Powered by Next.js, Tailwind CSS, and YOLOv11</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
