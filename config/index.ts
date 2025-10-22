import { join } from "path";
import { homedir } from "os";

//* Scripts Config
const YOLO_CONFIG_PATH = join(__dirname, "..", "config", "data.yaml");
const KAGGLE_CREDENTIALS_PATH = join(homedir(), ".kaggle", "kaggle.json");
const CONFIG_PATH = join(
  __dirname,
  "..",
  "config",
  "dataset.config.json"
);

export { YOLO_CONFIG_PATH, KAGGLE_CREDENTIALS_PATH, CONFIG_PATH };
