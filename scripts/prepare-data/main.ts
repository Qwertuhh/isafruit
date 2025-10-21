import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import terminalKit from "terminal-kit";
import { homedir, userInfo } from "os";

// Initialize terminal
const { terminal: term } = terminalKit;

// Configure terminal
term.fullscreen(true);
term.grabInput(true);

// Handle process exit
process.on("exit", () => {
  term.grabInput(false);
  term.processExit(0);
});

// Handle Ctrl+C
term.on("key", (key: string) => {
  if (key === "CTRL_C") {
    term.red("\nOperation cancelled by user\n");
    process.exit(0);
  }
});

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
type Config = {
  kaggle: {
    dataset: string;
    destination: string;
  };
  yolo: {
    data: {
      train: string;
      val: string;
      test: string;
      names: string[];
      nc: number;
    };
  };
};

// Constants
const CONFIG_PATH = path.join(
  __dirname,
  "..",
  "..",
  "config",
  "dataset.config.json"
);
const YOLO_CONFIG_PATH = path.join(__dirname, "..", "config", "data.yaml");
const KAGGLE_CREDENTIALS_PATH = path.join(
  homedir(),
  ".kaggle",
  "kaggle.json"
);


// Utility functions
const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    term.green(`✓ Created directory: ${dirPath}\n`);
  }
};

const loadConfig = (): Config => {
  try {
    const configFile = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(configFile);
  } catch (error) {
    term.red(`❌ Error loading config file: ${error}\n`);
    process.exit(1);
  }
};

const showSpinner = async (text: string): Promise<() => void> => {
  const spinner = await term.spinner();
  term(` ${text} `);

  return () => {
    spinner.animate(false);
    term("\n");
  };
};

const installDependencies = async (): Promise<void> => {
  const done = await showSpinner("Checking for required dependencies...");
  let kaggleInstalled = false;

  try {
    // First try running kaggle directly
    execSync("kaggle --version", { stdio: "pipe" });
    kaggleInstalled = true;
  } catch (error) {
    term.yellow("⚠ Kaggle CLI not found. Attempting to install...", error);
    try {
      done();
      const installDone = await showSpinner("Kaggle CLI not found. Installing with uv tool...");
      execSync("uv tool install kaggle", { stdio: "inherit" });
      installDone();
      kaggleInstalled = true;
      term.green("✓ Kaggle CLI installed successfully\n");
    } catch (installError) {
      done();
      term.red("❌ Failed to install Kaggle CLI.\n");
      term.red(`Error: ${installError}\n`);
      term("Please try installing it manually with:\n");
      term.cyan("uv tool install kaggle\n");
      process.exit(1);
    }
  }

  if (kaggleInstalled) {
    try {
      // Verify kaggle is in PATH and working
      const version = execSync("kaggle --version", { encoding: "utf-8" }).trim();
      done();
      term.green(`✓ Kaggle CLI is installed (${version})\n`);
    } catch (error) {
      done();
      term.yellow("⚠ Kaggle CLI is installed but not in PATH. Please add it to your PATH.\n");
      term.red(`Error: ${error}\n`)
      term("Please try adding it to your PATH manually with:\n");
      term.cyan("uv tool install kaggle\n");

      process.exit(1);
    }
  }
};

const downloadDataset = async (config: Config): Promise<void> => {
  const { dataset, destination } = config.kaggle;
  const destPath = path.resolve(process.cwd(), destination);

  term.blue.bold("\n=== Dataset Download ===\n");
  term(`Dataset: `).cyan(`${dataset}\n`);
  term(`Destination: `).cyan(`${destPath}\n\n`);

  try {
    // Create destination directory if it doesn't exist
    ensureDirectoryExists(destPath);

    // Execute the Python script
    const done = await showSpinner("Downloading dataset...");

    try {
      const cmd = [
        "kaggle", "datasets", "download",
          "-d", dataset,
          "-p", destination,
          "--unzip",
          "--force"
      ]
      console.log(cmd.join(" "));
      execSync(cmd.join(" "), { stdio: "pipe" });
      

      done();
      term.green("✓ Download completed successfully!\n");
    } catch (error) {
      done();
      term.red("❌ Download failed!\n");
      if (error instanceof Error) {
        term.red(`Error: ${error.message}\n`);
      }
      throw error;
    }
  } catch (error) {
    term.red(`\n❌ Error during dataset download.\n`);
    term.red(`Error: ${error}\n`);
    process.exit(1);
  }
};

interface YoloConfig {
  path: string;
  train: string;
  val: string;
  test: string;
  names: Record<number, string>;
  nc: number;
}

const prepareYoloStructure = async (config: Config): Promise<boolean> => {
  const { yolo } = config;
  const basePath = path.dirname(yolo.data.train);

  // Ask user if they want to generate YOLO config
  term.blue.bold("\n=== YOLO Configuration ===\n");

  const { selectedIndex } = await term.singleColumnMenu(["Yes", "No"], {
    style: term.blue,
    selectedStyle: term.bgBlue.black,
    leftPadding: "  ",
    continueOnSubmit: false,
    y: 1,
  }).promise;

  if (selectedIndex === 1) {
    // No
    term.yellow("\nSkipping YOLO configuration.\n");
    return false;
  }

  term("\n");
  const done = await showSpinner("Preparing YOLO configuration...");

  try {
    // Create necessary directories
    ensureDirectoryExists(path.dirname(YOLO_CONFIG_PATH));
    ensureDirectoryExists(path.join(basePath, "images"));
    ensureDirectoryExists(path.join(basePath, "labels"));

    // Create YAML configuration
    const yoloConfig: YoloConfig = {
      path: basePath,
      train: path.relative(basePath, yolo.data.train),
      val: path.relative(basePath, yolo.data.val),
      test: path.relative(basePath, yolo.data.test),
      names: yolo.data.names.reduce((acc, name, index) => {
        acc[index] = name;
        return acc;
      }, {} as Record<number, string>),
      nc: yolo.data.names.length,
    };

    // Write YAML config
    fs.writeFileSync(
      YOLO_CONFIG_PATH,
      yaml.dump(yoloConfig, { lineWidth: -1 }),
      "utf-8"
    );

    done();
    term.green(`✓ YOLO configuration saved to: ${YOLO_CONFIG_PATH}\n`);
    return true;
  } catch (error) {
    done();
    term.red("❌ Failed to prepare YOLO configuration.\n");
    if (error instanceof Error) {
      term.red(`Error: ${error.message}\n`);
    }
    return false;
  }
};

// Main function
const main = async (): Promise<void> => {
  term.clear();
  term.blue.bold("=== Dataset Preparation Tool ===\n\n");

  // Check if kaggle.json exists
  if (!fs.existsSync(KAGGLE_CREDENTIALS_PATH)) {
    term.red("\n❌ Kaggle credentials not found.         \n\n");
    term(`Please create a kaggle.json file in ${KAGGLE_CREDENTIALS_PATH}\n\n`);
    term("You can get your API credentials from: ");
    term.underline("https://www.kaggle.com/account");
    process.exit(1);
  }
  term.green("✓ Kaggle credentials found\n\n");

  try {
    // Load configuration
    term.blue.bold("\n=== Loading Configuration ===\n");
    const config = loadConfig();
    term.green("✓ Configuration loaded successfully\n");

    // Install required dependencies
    await installDependencies();

    // Download dataset
    await downloadDataset(config);

    // Prepare YOLO structure
    await prepareYoloStructure(config);

    term.blue.bold("\n=== Operation Complete ===\n");
    term.green("✓ All tasks completed successfully!\n\n");

    // Wait for user to press a key before exiting
    term("Press any key to exit...");
    await term.inputField({ echo: false }).promise;
  } catch (error) {
    term.red("\n❌ An error occurred during execution.\n");
    if (error instanceof Error) {
      term.red(`Error: ${error.message}\n`);
    }

    // Wait for user to press a key before exiting
    term("\nPress any key to exit...");
    await term.inputField({ echo: false }).promise;

    process.exit(1);
  } finally {
    term.processExit(0);
  }
};

// Run the main function
main().finally(() => {
  // Ensure terminal is properly reset on exit
  setTimeout(() => {
    term.processExit(0);
  }, 100);
});
