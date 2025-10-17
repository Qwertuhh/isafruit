# Real-Time Video Inference Setup

This Next.js application provides a webcam selector component with real-time video capture capabilities, designed for integration with YOLO detection and WebRTC streaming.

## Tech Stack

- **Frontend**: Next.js 15.5 with React 19
- **Language**: TypeScript (100%)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Icons**: Lucide React
- **UI Components**: Radix UI primitives

## Features

✅ **Webcam Device Selection** - Automatically detects and lists all available cameras
✅ **Live Video Preview** - Real-time video feed display
✅ **Start/Stop Controls** - Toggle webcam stream on/off
✅ **Responsive Design** - Works on all screen sizes
✅ **Type-Safe** - Fully typed with TypeScript
✅ **Clean Architecture** - Modular component structure

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The application will start on [http://localhost:3000](http://localhost:3000)

### 3. Grant Camera Permissions

When you first access the page, your browser will request camera permissions. Click "Allow" to enable webcam access.

## Project Structure

```
isafruit/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with fonts and metadata
│   │   ├── page.tsx             # Home page with WebcamSelector
│   │   └── globals.css          # Global styles and Tailwind config
│   ├── components/
│   │   ├── WebcamSelector.tsx   # Main webcam component
│   │   └── ui/                  # shadcn/ui components
│   │       ├── button.tsx
│   │       └── select.tsx
│   └── lib/
│       └── utils.ts             # Utility functions (cn helper)
├── package.json
└── tsconfig.json
```

## WebcamSelector Component

### Usage

```tsx
import { WebcamSelector } from "@/components/WebcamSelector";

export default function Page() {
  return <WebcamSelector />;
}
```

### Features

- **Auto-detection**: Automatically enumerates all video input devices
- **Device switching**: Change cameras on-the-fly
- **Stream management**: Proper cleanup of media streams
- **Error handling**: Graceful error handling for permission denials

### Component API

The component is self-contained and requires no props. It manages its own state for:
- Available devices
- Selected device
- Stream active status
- Video element reference

## Next Steps for YOLO Integration

To integrate YOLO detection and WebRTC:

1. **Backend API Route** - Create `/api/inference` endpoint
2. **WebRTC Setup** - Add peer connection for streaming
3. **ONNX Runtime** - Integrate YOLO model with ONNX Runtime
4. **Canvas Overlay** - Add canvas for drawing detection boxes
5. **Real-time Processing** - Process frames and return annotated results

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (requires HTTPS in production)

## Security Notes

- Camera access requires HTTPS in production
- Permissions are requested on first use
- Streams are properly cleaned up on component unmount

## Build for Production

```bash
npm run build
npm start
```

## Troubleshooting

### Camera not detected
- Ensure camera is connected and not in use by another application
- Check browser permissions in settings
- Try refreshing the page

### Permission denied
- Click the camera icon in the address bar to manage permissions
- Clear site data and try again

### No video display
- Check if the stream is active (Start button should show "Stop")
- Open browser console for error messages
- Verify camera is working in other applications
