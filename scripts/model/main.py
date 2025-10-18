#!/usr/bin/env python3
"""
YOLO11 Model Converter
Converts YOLO11 PyTorch model to ONNX format for inference
"""

import os
import sys
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    print("❌ Error: ultralytics package not found")
    print("\n📦 Install it with:")
    print("   pip install ultralytics")
    sys.exit(1)

def convert_model(model_name='yolo11n'):
    """Convert YOLO11 model to ONNX format"""
    
    print(f"🚀 YOLO11 Model Converter\n")
    
    # Define paths
    project_root = Path(__file__).parent.parent.parent
    models_dir = project_root / 'public' / 'models'
    models_dir.mkdir(parents=True, exist_ok=True)
    
    pt_path = models_dir / f'{model_name}.pt'
    onnx_path = models_dir / f'{model_name}.onnx'
    
    # Check if ONNX already exists
    if onnx_path.exists():
        print(f"✅ ONNX model already exists: {onnx_path}")
        print(f"   Size: {onnx_path.stat().st_size / 1024 / 1024:.2f} MB")
        return
    
    # Download model if needed
    if not pt_path.exists():
        print(f"📥 Downloading {model_name}.pt...")
        model = YOLO(f'{model_name}.pt')
        # Move to models directory
        import shutil
        shutil.move(f'{model_name}.pt', pt_path)
    else:
        print(f"📂 Loading model from: {pt_path}")
        model = YOLO(str(pt_path))
    
    # Export to ONNX
    print(f"\n🔄 Converting to ONNX format...")
    print(f"   This may take a minute...\n")
    
    try:
        model.export(
            format='onnx',
            imgsz=640,
            simplify=True,
            opset=12
        )
        
        # Move ONNX file to models directory
        source_onnx = Path(f'{model_name}.onnx')
        if source_onnx.exists():
            import shutil
            shutil.move(str(source_onnx), str(onnx_path))
        
        print(f"✅ Conversion successful!")
        print(f"\n📊 Model Information:")
        print(f"   Location: {onnx_path}")
        print(f"   Size: {onnx_path.stat().st_size / 1024 / 1024:.2f} MB")
        print(f"   Format: ONNX")
        print(f"   Input Size: 640x640")
        
        print(f"\n🎉 Ready to use!")
        print(f"   Start the dev server: npm run dev")
        
    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    # Parse command line arguments
    model_name = sys.argv[1] if len(sys.argv) > 1 else 'yolo11n'
    
    valid_models = ['yolo11n', 'yolo11s', 'yolo11m', 'yolo11l', 'yolo11x']
    if model_name not in valid_models:
        print(f"❌ Invalid model name: {model_name}")
        print(f"   Valid options: {', '.join(valid_models)}")
        sys.exit(1)
    
    convert_model(model_name)
