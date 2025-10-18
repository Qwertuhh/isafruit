import os
import yaml

# Get absolute path of app
APP_DIR = os.path.dirname(os.path.realpath(__file__))
DATASET_DIR = os.path.join(APP_DIR, "../../../public/datasets/fruits-and-vegetables-detection")
TRAIN_DIR = os.path.join(DATASET_DIR, "train")
TEST_DIR = os.path.join(DATASET_DIR, "test")
YAML_PATH = os.path.join(DATASET_DIR, "config", "data.yaml")

def get_class_names(folder):
    return sorted([d for d in os.listdir(folder) if os.path.isdir(os.path.join(folder, d))])

def generate_yaml():
    class_names = get_class_names(TRAIN_DIR)
    nc = len(class_names)

    yaml_data = {
        "train": TRAIN_DIR,
        "val": TEST_DIR,
        "nc": nc,
        "names": class_names
    }

    os.makedirs(DATASET_DIR, exist_ok=True)
    with open(YAML_PATH, "w") as f:
        yaml.dump(yaml_data, f)

    print(f"✅ data.yaml generated at: {YAML_PATH}")
    print(f"Classes ({nc}): {class_names}")

if __name__ == "__main__":
    generate_yaml()
