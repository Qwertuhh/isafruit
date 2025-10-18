import https from "https";
import fs from "fs";
import path from "path";
import { terminal } from "terminal-kit";
import { promisify } from "util";
import stream from "stream";

const pipeline = promisify(stream.pipeline);

const MODEL_URL =
  "https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt";
const MODELS_DIR = path.join(__dirname, "..", "public", "models");
const MODEL_PATH = path.join(MODELS_DIR, "yolo11n.pt");

// Initialize terminal
try {
  terminal.clear();
} catch (e) {
  console.error("Failed to clear terminal: ", e);
}
terminal.cyan.bold("🚀 YOLO11 Model Downloader\n");

// Create models directory if it doesn't exist
if (!fs.existsSync(MODELS_DIR)) {
  terminal.cyan("📁 Creating models directory... ");
  try {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    terminal.green("Done!\n");
  } catch (error) {
    terminal.red(
      "Failed to create directory: " + (error as Error).message + "\n"
    );
    process.exit(1);
  }
}

// Check if PyTorch model already exists
if (fs.existsSync(MODEL_PATH)) {
  terminal.green("✅ Model already exists at: ").white(MODEL_PATH + "\n\n");
  terminal.yellow("Do you want to download the model again? (y/N) ");

  terminal.yesOrNo(
    { yes: ["y", "Y"], no: ["n", "N", "ENTER"] },
    (error, result) => {
      terminal("\n");
      if (result) {
        startDownload();
      } else {
        terminal.cyan("Model already downloaded. Run conversion next:\n");
        terminal.white("   npm run convert-model\n\n");
        process.exit(0);
      }
    }
  );
} else {
  startDownload();
}

function startDownload() {
  terminal.clear();
  terminal.cyan.bold("🚀 YOLO11 Model Downloader\n\n");
  terminal.cyan("📥 Downloading YOLO11n model...\n");
  terminal.cyan("   URL: ").white(MODEL_URL + "\n");
  terminal.cyan("   Destination: ").white(MODEL_PATH + "\n");
  terminal.cyan("   Size: ").white("~6MB\n\n");

  const file = fs.createWriteStream(MODEL_PATH);
  let downloadedBytes = 0;

  const progressBar = terminal.progressBar({
    width: 80,
    title: "Downloading:",
    eta: true,
    percent: true,
    items: 1,
    syncMode: true,
    barChar: "█",
    barHeadChar: "█",
    barStyle: terminal.brightCyan,
    itemStyle: terminal.brightGreen,
    titleSize: 15,
    inline: true,
  });

  const downloadStartTime = Date.now();

  async function downloadFile() {
    try {
      const response = await new Promise<import("http").IncomingMessage>(
        (resolve, reject) => {
          const req = https.get(MODEL_URL, resolve);
          req.on("error", reject);
        }
      );

      const totalBytes = parseInt(
        response.headers["content-length"] || "0",
        10
      );

      response.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        const progress = downloadedBytes / totalBytes;

        progressBar.update({
          progress,
          title: "Downloading:",
          items: 1,
        });
      });

      await pipeline(response, file);

      terminal("\n\n");
      terminal.green("✅ Model downloaded successfully!\n\n");

      terminal.blue("📋 Next steps:\n");
      terminal.cyan("   1. Convert model to ONNX format:\n");
      terminal.white("      npm run convert-model\n\n");
      terminal.cyan("   2. Start the development server:\n");
      terminal.white("      npm run dev\n\n");

      process.exit(0);
    } catch (err: Error | unknown) {
      fs.unlink(MODEL_PATH, () => {}); // Delete the file async if there was an error
      terminal("\n\n");
      terminal.red(
        `❌ Error downloading model: ${
          err instanceof Error ? err.message : "Unknown error"
        }\n`
      );
      terminal.cyan("\n💡 Alternative: Download manually from:\n");
      terminal.cyan("   https://github.com/ultralytics/assets/releases/\n\n");
      process.exit(1);
    }
  }

  downloadFile();
}
