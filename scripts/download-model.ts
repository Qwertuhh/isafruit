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
const ONNX_MODEL_PATH = path.join(MODELS_DIR, "yolo11n.onnx");

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

// Check if ONNX model already exists
if (fs.existsSync(ONNX_MODEL_PATH)) {
  terminal
    .yellow("⚠️  ONNX model already exists at: ")
    .white(ONNX_MODEL_PATH + "\n");
  terminal.yellow("Do you want to download and overwrite the model? (y/N) ");

  terminal.yesOrNo(
    { yes: ["y", "Y"], no: ["n", "N", "ENTER"] },
    (error, result) => {
      terminal("\n");
      if (result) {
        checkAndDownloadPytorchModel();
      } else {
        terminal.cyan("Using existing ONNX model.\n");
        terminal.cyan("To start the development server:\n");
        terminal.white("   npm run dev\n\n");
        process.exit(0);
      }
    }
  );
} else {
  checkAndDownloadPytorchModel();
}

function checkAndDownloadPytorchModel() {
  // Check if PyTorch model already exists
  if (fs.existsSync(MODEL_PATH)) {
    terminal
      .green("✅ PyTorch model already exists at: ")
      .white(MODEL_PATH + "\n\n");
    terminal.yellow("Do you want to download the model again? (y/N) ");

    terminal.yesOrNo(
      { yes: ["y", "Y"], no: ["n", "N", "ENTER"] },
      (error, result) => {
        terminal("\n");
        if (result) {
          startDownload();
        } else {
          terminal.cyan("Using existing PyTorch model. Run conversion next:\n");
          terminal.white("   npm run convert-model\n\n");
          process.exit(0);
        }
      }
    );
  } else {
    startDownload();
  }
}
async function startDownload() {
  terminal.clear();
  terminal.cyan.bold("🚀 YOLO11 Model Downloader\n\n");
  terminal.cyan("📥 Downloading YOLO11n model...\n");
  terminal.cyan("   URL: ").white(MODEL_URL + "\n");
  terminal.cyan("   Destination: ").white(MODEL_PATH + "\n");
  terminal.cyan("   Size: ").white("~6MB\n\n");

  // Create a unique temp file using process ID and timestamp
  const tempPath = `${MODEL_PATH}.${process.pid}.${Date.now()}.part`;

  // Ensure the directory exists
  if (!fs.existsSync(path.dirname(tempPath))) {
    fs.mkdirSync(path.dirname(tempPath), { recursive: true });
  }

  const file = fs.createWriteStream(tempPath);
  let downloadedBytes = 0;

  const progressBar = terminal.progressBar({
    width: 80,
    title: "Downloading",
    eta: true,
    percent: true,
    barChar: "█",
    barHeadChar: "█",
    barStyle: terminal.brightCyan,
    titleStyle: terminal.bold,
  });

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
        if (totalBytes > 0) {
          const progress = downloadedBytes / totalBytes;
          progressBar.update(progress);
        }
      });

      await pipeline(response, file);

      // Close the file handle before renaming
      await new Promise((resolve) => file.close(resolve));

      // Verify file size matches expected
      const stats = fs.statSync(tempPath);
      if (totalBytes > 0 && stats.size !== totalBytes) {
        throw new Error(
          `Download incomplete: expected ${totalBytes} bytes but got ${stats.size}`
        );
      }

      // First write to a temporary file in the same directory
      const finalTempPath = `${MODEL_PATH}.${Date.now()}.tmp`;
      fs.renameSync(tempPath, finalTempPath);

      // Then do an atomic rename to the final destination
      fs.renameSync(finalTempPath, MODEL_PATH);

      terminal("\n\n");
      terminal.green("✅ Model downloaded successfully!\n\n");

      // If ONNX model exists, delete it since it's now outdated
      if (fs.existsSync(ONNX_MODEL_PATH)) {
        try {
          fs.unlinkSync(ONNX_MODEL_PATH);
          terminal.yellow(
            "⚠️  Deleted existing ONNX model as it's now outdated.\n"
          );
        } catch (err) {
          terminal
            .red("❌ Failed to delete existing ONNX model: ")
            .white((err as Error).message + "\n");
        }
      }

      terminal.blue("📋 Next steps:\n");
      terminal.cyan("   1. Convert model to ONNX format:\n");
      terminal.white("      npm run convert-model\n\n");
      terminal.cyan("   2. Start the development server:\n");
      terminal.white("      npm run dev\n\n");

      process.exit(0);
    } catch (err: Error | unknown) {
      // Clean up any temporary files
      const cleanup = (filePath: string) => {
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      };

      cleanup(tempPath);

      // Clean up any temporary final files
      const dir = path.dirname(MODEL_PATH);
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        if (file.startsWith(path.basename(MODEL_PATH) + ".")) {
          cleanup(path.join(dir, file));
        }
      });

      terminal("\n\n");
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      terminal.red(`❌ Error downloading model: ${errorMessage}\n`);

      if (
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("ETIMEDOUT")
      ) {
        terminal.yellow(
          "\n⚠️  Network error occurred. Please check your internet connection.\n"
        );
      }

      terminal.cyan("\n💡 Alternative: Download manually from:\n");
      terminal.cyan("   https://github.com/ultralytics/assets/releases/\n\n");
      process.exit(1);
    }
  }

  // Add error handling for the downloadFile promise
  downloadFile().catch((err) => {
    terminal.red(`\n\n❌ Fatal error in download process: ${err.message}\n`);
    process.exit(1);
  });
}
