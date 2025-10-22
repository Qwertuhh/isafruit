import fs from "fs";
import terminalKit from "terminal-kit";
import { Config } from "@home/types";
import { CONFIG_PATH } from "@home/config";

const { terminal: term } = terminalKit;

const showSpinner = async (text: string): Promise<() => void> => {
  term("\n"); // ensure spinner starts on a new line
  const spinner = await term.spinner();
  term(` ${text} `);
  return () => {
    spinner.animate(false);
    term("\n");
  };
};

const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    term.green(`✓ Created directory: ${dirPath}\n`);
  }
};
/**
 * Load configuration from dataset.config.json
 */
const loadConfig = (): Config => {
  try {
    const configFile = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(configFile);
  } catch (error) {
    term.red(`❌ Error loading config file: ${error}\n`);
    process.exit(1);
  }
};

export { term, showSpinner, ensureDirectoryExists, loadConfig };
