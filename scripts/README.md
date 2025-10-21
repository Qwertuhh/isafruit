# Dataset Download and Preparation Script

This script automates the process of downloading datasets from Kaggle and preparing them for YOLO model training.

## Prerequisites

1. Node.js (v14 or later)
2. Kaggle API credentials
3. Python 3.6+ (for Kaggle API)

## Setup

1. Install required Node.js dependencies:
   ```bash
   npm install js-yaml @types/node
   ```

2. Set up Kaggle API:
   - Create a Kaggle account if you don't have one
   - Go to your Kaggle account settings and create a new API token (https://www.kaggle.com/account)
   - Place the downloaded `kaggle.json` in `~/.kaggle/` directory (Linux/Mac) or `C:\Users\<Windows-username>\.kaggle\` (Windows)
   - Make sure the file has the correct permissions:
     ```bash
     chmod 600 ~/.kaggle/kaggle.json
     ```

3. Configure the dataset:
   - Edit `config/dataset.config.json` with your Kaggle dataset details and desired directory structure
   - Update the class names in the `yolo.data.names` array
   - The `nc` value should match the number of classes

## Usage

1. Run the script:
   ```bash
   npx ts-node scripts/download-dataset.ts
   ```

2. The script will:
   - Check for required dependencies
   - Download the dataset from Kaggle
   - Create the necessary directory structure
   - Generate a YOLO-compatible `data.yaml` configuration file

## Output

- Downloaded dataset will be saved to the directory specified in `kaggle.destination`
- YOLO configuration will be saved to `config/data.yaml`
- Directory structure will be created as specified in the config file

## Customization

You can modify the following in `config/dataset.config.json`:
- `kaggle.dataset`: The Kaggle dataset identifier (username/dataset)
- `kaggle.destination`: Where to download the dataset
- `yolo.data.train/val/test`: Paths for training, validation, and test sets
- `yolo.data.names`: List of class names
- `yolo.data.nc`: Number of classes
