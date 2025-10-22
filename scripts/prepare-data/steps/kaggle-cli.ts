import { KAGGLE_CREDENTIALS_PATH } from "@home/config";
import fs from "fs";
import { term } from "@home/scripts/terminalUtils";
import { showSpinner } from "@home/scripts/terminalUtils";
import { execSync } from "child_process";

/**
 * Verify Kaggle credentials exist
 */
const verifyKaggleCredentials = (): boolean => {
  if (!fs.existsSync(KAGGLE_CREDENTIALS_PATH)) {
    term.red("\n❌ Kaggle credentials not found.\n");
    term(`Please create a kaggle.json file in ${KAGGLE_CREDENTIALS_PATH}\n`);
    term("Get your API credentials from: ");
    term.underline("https://www.kaggle.com/account\n");
    return false;
  }
  term.green("✓ Kaggle credentials found\n");
  return true;
};

/**
 * Install Kaggle CLI if not present
 */
const installKaggleCLI = async (): Promise<void> => {
  const done = await showSpinner("Checking for Kaggle CLI...");
  try {
    execSync("kaggle --version", { stdio: "pipe" });
    done();
    term.green("✓ Kaggle CLI is already installed\n");
  } catch {
    done();
    const installDone = await showSpinner("Installing Kaggle CLI...");
    try {
      execSync("uv tool install kaggle", { stdio: "inherit" });
      installDone();
      term.green("✓ Kaggle CLI installed successfully\n");
    } catch (error) {
      installDone();
      term.red("❌ Failed to install Kaggle CLI\n");
      term.red(`Error: ${error}\n`);
      process.exit(1);
    }
  }
};

export {
  verifyKaggleCredentials,
  installKaggleCLI,
};
