import type { Metadata } from "next";
import { Montserrat, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

// Main font for body text
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Monospace font for code
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Display font for headings
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Real-Time Video Inference | YOLO Detection",
  icons: {
    icon: [
      { url: '/logo-bg.svg' },
    ],
    shortcut: [
      { url: '/logo-bg.svg' },
    ],
    apple: [
      { url: '/logo-bg.svg' },
    ],
  },
  manifest: '/site.webmanifest',
  description:
    "Next.js app with TypeScript backend for real-time video inference using WebRTC and YOLO detection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      </head>
      <body
        className={`${montserrat.variable} ${jetBrainsMono.variable} ${playfairDisplay.variable}`}
      >
        <Toaster richColors position="bottom-center" />
        {children}
      </body>
    </html>
  );
}
