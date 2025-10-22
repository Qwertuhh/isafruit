import { KAGGLE_CREDENTIALS_PATH } from "@home/config";
import fs from "fs";
import { showSpinner } from "@home/scripts/terminalUtils";
import { execSync } from "child_process";
import { Terminal } from "terminal-kit";

/**
 * Verify Kaggle credentials exist
 */
function verifyKaggleCredentials(term: Terminal): boolean {
  if (!fs.existsSync(KAGGLE_CREDENTIALS_PATH)) {
    term.red("\n❌ Kaggle credentials not found.\n");
    term(`Please create a kaggle.json file in ${KAGGLE_CREDENTIALS_PATH}\n`);
    term("Get your API credentials from: ");
    term.underline("https://www.kaggle.com/account\n");
    return false;
  }
  term.green("✓ Kaggle credentials found\n");
  return true;
}

/**
 * Check if Kaggle CLI is installed
 */
function isKaggleCLIExists(): boolean {
  try {
    execSync("kaggle --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
/**
 * Install Kaggle CLI if not present
 */
async function installKaggleCLI(term: Terminal): Promise<void> {
  const done = await showSpinner("Checking for Kaggle CLI...");

  if (isKaggleCLIExists()) {
    done();
    term.green("✓ Kaggle CLI is already installed\n");
    return;
  }
  const installDone = await showSpinner("Installing Kaggle CLI...");
  try {
    execSync("uv tool install kaggle", { stdio: "inherit" });
    installDone();
    term.green("✓ Kaggle CLI installed successfully\n");
  } catch (error) {
    installDone();
    term.red("❌ Failed to install Kaggle CLI\n");
    term.red("Please install it manually using: uv tool install kaggle\n");
    term.red(`Error: ${error}\n`);
    process.exit(1);
  }
}

export { verifyKaggleCredentials, isKaggleCLIExists, installKaggleCLI };
