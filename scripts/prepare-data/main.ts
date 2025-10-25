/**
 * Dataset Preparation Tool
 * Automates downloading datasets from Kaggle and preparing YOLO configuration.
 */

import path from "path";
import { fileURLToPath } from "url";
import {
  term,
} from "@home/scripts/terminalUtils";
import {
  installKaggleCLI,
  isKaggleCLIExists,
  verifyKaggleCredentials,
  downloadDataset,
  prepareDataset,
  prepareConfigFile,
  prepareModel,
} from "@home/scripts/prepare-data/steps";
import { DATASETS_DATA_DESTINATION, DATASETS_NAME, MODEL_DATA_DESTINATION } from "@home/config";

// Configure terminal with scrollback
term.grabInput(true);
term.fullscreen(true);
term.hideCursor(true);


process.on("exit", () => {
  term.grabInput(false);
  term.processExit(0);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname, __filename);

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

  if (!verifyKaggleCredentials(term)) {
    return term.processExit(1);
  }
  if (!isKaggleCLIExists()) {
    if (await promptStep("Install Dependencies")) {
      await installKaggleCLI(term);
    }
  }else{
    term.green("✓ Kaggle CLI is already installed\n");
  }

  // if (await promptStep("Download Dataset")) {
  //   await downloadDataset(term);
  // }

  // if (await promptStep("Prepare Datasets")) {
  //   await prepareDataset(term);
  // }

  // if (await promptStep("Prepare YOLO Config")) {
  //   await prepareConfigFile(term);
  // }
  if (await promptStep("Train Model")) {
    const datasetDir = path.join(DATASETS_DATA_DESTINATION, DATASETS_NAME[1]);
    const outputDir = path.join(MODEL_DATA_DESTINATION, "pmodel");
    await prepareModel(datasetDir, outputDir, term);
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
