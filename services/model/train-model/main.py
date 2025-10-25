import os
import sys
import argparse
from pathlib import Path
from ultralytics import YOLO

def parse_args():
    parser = argparse.ArgumentParser(description='Train YOLOv11 model')
    parser.add_argument('--data', type=str, required=True, help='Path to data.yaml')
    parser.add_argument('--epochs', type=int, default=100, help='Number of epochs')
    parser.add_argument('--batch', type=int, default=16, help='Batch size')
    parser.add_argument('--imgsz', type=int, default=640, help='Image size')
    parser.add_argument('--model', type=str, default='yolov8n.pt', help='Model to use')
    parser.add_argument('--output', type=str, default='runs/detect/train', help='Output directory')
    parser.add_argument('--device', type=str, default='0', help='Device to use (e.g., 0 for GPU 0 or "cpu")')
    parser.add_argument('--workers', type=int, default=4, help='Number of worker threads')
    parser.add_argument('--patience', type=int, default=50, help='Early stopping patience')
    return parser.parse_args()

def train():
    args = parse_args()
    
    try:
        # Convert all paths to absolute
        data_path = Path(args.data).absolute()
        model_path = Path(args.model).absolute()
        output_dir = Path(args.output).absolute()
        
        # Validate paths
        if not data_path.exists():
            print(f"Error: Data file not found at {data_path}")
            sys.exit(1)
            
        if not model_path.exists():
            print(f"Error: Model file not found at {model_path}")
            sys.exit(1)
        
        # Create output directory if it doesn't exist
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"Using data from: {data_path}")
        print(f"Using model: {model_path}")
        print(f"Saving output to: {output_dir}")
        
        # Initialize model with absolute path
        model = YOLO(str(model_path))
        
        # Train the model
        results = model.train(
            data=str(data_path),
            epochs=args.epochs,
            batch=args.batch,
            imgsz=args.imgsz,
            device=args.device,
            workers=args.workers,
            patience=args.patience,
            project=str(output_dir),
            exist_ok=True
        )
        
        print(f"\n✅ Training completed. Results saved to {output_dir}")
        return 0
    except Exception as e:
        print(f"\n❌ Error during training: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(train())