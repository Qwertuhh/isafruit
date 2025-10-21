import os
import sys
import subprocess
import shutil
from pathlib import Path



def download_kaggle_dataset(dataset_name: str, destination: str) -> None:
    """
    Download a dataset from Kaggle using the Kaggle API.
    """
    try:
        os.makedirs(destination, exist_ok=True)

        cmd = [
          "uv", "run", "--project", "D:/ME/CODE/Projects/isafruit",
          "kaggle", "datasets", "download",
            "-d", dataset_name,
            "-p", destination,
            "--unzip",
            "--force"
        ]

        print(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode == 0:
            print("✅ Dataset downloaded and extracted successfully!")
        else:
            print("❌ Error downloading dataset")
            print(result.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

def main():
    if len(sys.argv) != 3:
        print("Usage: python download.py <dataset_name> <destination>")
        sys.exit(1)

    dataset_name = sys.argv[1]
    destination = sys.argv[2]
    download_kaggle_dataset(dataset_name, destination)

if __name__ == "__main__":
    main()
