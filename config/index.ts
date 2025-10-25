import { join } from "path";
import { homedir } from "os";

//* Scripts Config
const YOLO_CONFIG_PATH = join(__dirname, "..", "config", "data.yaml");
const KAGGLE_CREDENTIALS_PATH = join(homedir(), ".kaggle", "kaggle.json");
const CONFIG_PATH = join(__dirname, "..", "config", "dataset.config.json");
const KAGGLE_DATASET_NAME = "heptapod/titanic";

//? Where the raw kaggle data will be downloaded
const RAW_DATA_DESTINATION = "../../public/raw/data"; 

//* Datasets Config
const DATASETS_DATA_DESTINATION = "../../public/datasets/"; 
const DATASETS_NAME = ["fruits-and-vegetables", "fruits-or-vegetables"]; 

//* Model Config
const MODEL_DATA_DESTINATION = "../../public/models/";
const BASE_MODEL = "yolo11n";

export {
  YOLO_CONFIG_PATH,
  KAGGLE_CREDENTIALS_PATH,
  CONFIG_PATH,
  KAGGLE_DATASET_NAME,
  RAW_DATA_DESTINATION,
  DATASETS_DATA_DESTINATION,
  DATASETS_NAME,
  MODEL_DATA_DESTINATION,
  BASE_MODEL,
};
