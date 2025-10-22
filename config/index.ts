import { join } from "path";
import { homedir } from "os";

//* Scripts Config
const YOLO_CONFIG_PATH = join(__dirname, "..", "config", "data.yaml");
const KAGGLE_CREDENTIALS_PATH = join(homedir(), ".kaggle", "kaggle.json");
const CONFIG_PATH = join(__dirname, "..", "config", "dataset.config.json");
const KAGGLE_DATASET_NAME = "heptapod/titanic";
const RAW_DATA_DESTINATION = "../../public/raw/data"; //? Where the raw kaggle data will be downloaded
export {
  YOLO_CONFIG_PATH,
  KAGGLE_CREDENTIALS_PATH,
  CONFIG_PATH,
  KAGGLE_DATASET_NAME,
  RAW_DATA_DESTINATION,
};
