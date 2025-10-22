import path from "path";
import { ensureDirectoryExists } from "@home/scripts/terminalUtils";
import { showSpinner } from "@home/scripts/terminalUtils";
import { execSync } from "child_process";
import { Terminal } from "terminal-kit";
import { KAGGLE_DATASET_NAME, RAW_DATA_DESTINATION } from "@home/config";

/**
 * Download dataset from Kaggle
 */
async function downloadDataset(term: Terminal): Promise<void> {
  const destPath = path.resolve(process.cwd(), RAW_DATA_DESTINATION);
  ensureDirectoryExists(destPath);

  const done = await showSpinner("Downloading dataset...");
  try {
    execSync(
      `kaggle datasets download -d ${KAGGLE_DATASET_NAME} -p ${RAW_DATA_DESTINATION} --unzip --force`,
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

export {downloadDataset};
