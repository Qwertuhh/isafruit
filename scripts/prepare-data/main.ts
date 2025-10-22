/**
 * Dataset Preparation Tool
 * Automates downloading datasets from Kaggle and preparing YOLO configuration.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import {
  showSpinner,
  ensureDirectoryExists,
  term,
  loadConfig,
} from "@home/scripts/terminalUtils";
import { YOLO_CONFIG_PATH } from "@home/config";
import {
  installKaggleCLI,
  verifyKaggleCredentials,
} from "@home/scripts/prepare-data/steps/kaggle-cli";
import { Config } from "@home/types";

term.fullscreen(true);
term.grabInput(true);

process.on("exit", () => {
  term.grabInput(false);
  term.processExit(0);
});

term.on("key", (key: string) => {
  if (key === "CTRL_C") {
    term.red("\nOperation cancelled by user\n");
    process.exit(0);
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname, __filename);

/**
 * Download dataset from Kaggle
 */
const downloadDataset = async (config: Config): Promise<void> => {
  const { dataset, destination } = config.kaggle;
  const destPath = path.resolve(process.cwd(), destination);
  ensureDirectoryExists(destPath);

  const done = await showSpinner("Downloading dataset...");
  try {
    execSync(
      `kaggle datasets download -d ${dataset} -p ${destination} --unzip --force`,
      {
        stdio: "pipe",
      }
    );
    done();
    term.green("✓ Dataset downloaded successfully\n");
  } catch (error) {
    done();
    term.red("❌ Dataset download failed\n");
    term.red(`Error: ${error}\n`);
    process.exit(1);
  }
};

/**
 * Prepare YOLO configuration YAML
 */
const prepareYoloConfig = async (config: Config): Promise<void> => {
  const { yolo } = config;
  const basePath = path.dirname(yolo.data.train);

  term("\n"); // spacing before menu
  term.blue.bold("Do you want to generate YOLO config?\n");

  const { selectedIndex } = await term.singleColumnMenu(["Yes", "No"], {
    style: term.blue,
    selectedStyle: term.bgBlue.black,
    leftPadding: "  ",
    continueOnSubmit: false,
  }).promise;

  if (selectedIndex === 1) {
    term.yellow("\nSkipping YOLO configuration.\n");
    return;
  }

  const done = await showSpinner("Preparing YOLO configuration...");
  try {
    ensureDirectoryExists(path.dirname(YOLO_CONFIG_PATH));
    ensureDirectoryExists(path.join(basePath, "images"));
    ensureDirectoryExists(path.join(basePath, "labels"));

    const yoloConfig = {
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

    fs.writeFileSync(
      YOLO_CONFIG_PATH,
      yaml.dump(yoloConfig, { lineWidth: -1 }),
      "utf-8"
    );
    done();
    term.green(`✓ YOLO configuration saved to ${YOLO_CONFIG_PATH}\n`);
  } catch (error) {
    done();
    term.red("❌ Failed to prepare YOLO configuration\n");
    term.red(`Error: ${error}\n`);
  }
};

/**
 * Prompt user to run a step
 */
const promptStep = async (stepName: string): Promise<boolean> => {
  term("\n"); // spacing before menu
  term.cyan.bold(`Run step: ${stepName}?\n`);
  const { selectedIndex } = await term.singleColumnMenu(["Yes", "No"], {
    style: term.cyan,
    selectedStyle: term.bgCyan.black,
    leftPadding: "  ",
    continueOnSubmit: false,
  }).promise;
  return selectedIndex === 0;
};

/**
 * Main execution flow
 */
const main = async (): Promise<void> => {
  term.clear();
  term.moveTo(1, 1); // ensure cursor starts top-left
  term.blue.bold("=== Dataset Preparation Tool ===\n\n");

  const config = loadConfig();

  if (!verifyKaggleCredentials()) {
    if (await promptStep("Install Dependencies")) {
      await installKaggleCLI();
    }
  }

  if (await promptStep("Download Dataset")) {
    await downloadDataset(config);
  }

  if (await promptStep("Prepare YOLO Config")) {
    await prepareYoloConfig(config);
  }

  term.blue.bold("\n=== All Tasks Completed ===\n");
  term.green("✓ Operation finished successfully\n");
  term("\nPress enter key to exit...");
  await term.inputField({ echo: false }).promise;
  term.processExit(0);
};

main().finally(() => {
  setTimeout(() => term.processExit(0), 100);
});
