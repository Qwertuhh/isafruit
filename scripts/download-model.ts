import https from 'https';
import fs from 'fs';
import path from 'path';

const MODEL_URL = 'https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt';
const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');
const MODEL_PATH = path.join(MODELS_DIR, 'yolo11n.pt');

console.log('🚀 YOLO11 Model Downloader\n');

// Create models directory if it doesn't exist
if (!fs.existsSync(MODELS_DIR)) {
  console.log('📁 Creating models directory...');
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

// Check if model already exists
if (fs.existsSync(MODEL_PATH)) {
  console.log('✅ Model already exists at:', MODEL_PATH);
  console.log('\n⚠️  Note: You need to convert this to ONNX format:');
  console.log('   uv add ultralytics');
  console.log('   python -c "from ultralytics import YOLO; YOLO(\'public/models/yolo11n.pt\').export(format=\'onnx\')"');
  process.exit(0);
}

console.log('📥 Downloading YOLO11n model...');
console.log('   URL:', MODEL_URL);
console.log('   Destination:', MODEL_PATH);
console.log('   Size: ~6MB\n');

const file = fs.createWriteStream(MODEL_PATH);
let downloadedBytes = 0;

https.get(MODEL_URL, (response) => {
  const totalBytes = parseInt(response?.headers['content-length'] || '0', 10);
  
  response.on('data', (chunk) => {
    downloadedBytes += chunk.length;
    const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
    process.stdout.write(`\r   Progress: ${progress}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
  });
  
  response.pipe(file);
  
  file.on('finish', () => {
    file.close();
    console.log('\n\n✅ Model downloaded successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Install Python dependencies:');
    console.log('      uv add ultralytics\n');
    console.log('   2. Convert to ONNX format:');
    console.log('      python -c "from ultralytics import YOLO; YOLO(\'public/models/yolo11n.pt\').export(format=\'onnx\')"');
    console.log('\n   3. Start the development server:');
    console.log('      npm run dev\n');
  });
}).on('error', (err) => {
  fs.unlink(MODEL_PATH, () => {});
  console.error('\n❌ Error downloading model:', err.message);
  console.log('\n💡 Alternative: Download manually from:');
  console.log('   https://github.com/ultralytics/assets/releases/');
  process.exit(1);
});
