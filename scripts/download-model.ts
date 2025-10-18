import https from "https";
import fs from "fs";
import path from "path";
import { terminal } from "terminal-kit";
import { promisify } from "util";
import stream from "stream";
import { execSync } from "child_process";

const pipeline = promisify(stream.pipeline);

const MODEL_URL =
  "https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt";
const MODELS_DIR = path.join(__dirname, "..", "public", "models");
const MODEL_PATH = path.join(MODELS_DIR, "yolo11n.pt");
const ONNX_MODEL_PATH = path.join(MODELS_DIR, "yolo11n.onnx");
const MODEL_CONVERTER_SCRIPT = path.join(
  __dirname,
  "model",
  "model-convertor",
  "main.py"
);

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
    .green("✅ ONNX model already exists at: ")
    .white(ONNX_MODEL_PATH + "\n\n");
  terminal.cyan("No conversion needed. You can start using the model.\n");
  process.exit(0);
}

// Check if PyTorch model exists but needs conversion
if (fs.existsSync(MODEL_PATH)) {
  terminal.green("✅ Model already exists at: ").white(MODEL_PATH + "\n\n");

  terminal.yellow("⚠️  Note: You need to convert this to ONNX format:\n");
  terminal.cyan("   uv add ultralytics\n");
  terminal.cyan("   uv run model/model-convertor/main.py\n\n");

  terminal.yellow("Do you want to download the model again? (y/N) ");

  terminal.yesOrNo(
    { yes: ["y", "Y"], no: ["n", "N", "ENTER"] },
    (error, result) => {
      terminal("\n");
      if (result) {
        startDownload();
      } else {
        terminal.cyan("Exiting...\n");
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

      terminal.blue("Next steps:\n");

      // Check if we can run the conversion automatically
      if (fs.existsSync(MODEL_CONVERTER_SCRIPT)) {
        terminal.cyan("\n🔄 Attempting to convert model to ONNX format...\n");

        try {
          // Run the conversion script
          execSync("uv run model/model-convertor/main.py", {
            stdio: "inherit",
          });

          if (fs.existsSync(ONNX_MODEL_PATH)) {
            terminal.green(
              "\n✅ Successfully converted model to ONNX format!\n"
            );
            terminal.cyan("You can now start using the model.\n");
          } else {
            throw new Error("ONNX model was not created");
          }
        } catch (error: Error | unknown) {
          terminal.yellow(
            "\nFailed to automatically convert model. Please run manually:\n"
          );
          terminal.cyan("   1. Enter the model directory:\n");
          terminal.white(`      cd ${MODEL_CONVERTER_SCRIPT}\n\n`);
          terminal.cyan("   2. Install Python dependencies:\n");
          terminal.white("      uv add ultralytics\n\n");
          terminal.cyan("   3. Convert to ONNX format:\n");
          terminal.white(`      uv run ${MODEL_CONVERTER_SCRIPT}\n\n`);
        }
      } else {
        terminal.cyan("   1. Enter the model directory:\n");
        terminal.white(`      cd ${MODEL_CONVERTER_SCRIPT}\n\n`);
        terminal.cyan("   2. Install Python dependencies:\n");
        terminal.white("      uv add ultralytics\n\n");
        terminal.cyan("   3. Convert to ONNX format:\n");
        terminal.white(`      uv run ${MODEL_CONVERTER_SCRIPT}\n\n`);
      }

      terminal.cyan("   3. Start the development server:\n");
      terminal.white("      npm run dev\n\n");

      // Exit successfully after completion
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
