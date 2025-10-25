import {
  RAW_DATA_DESTINATION,
  DATASETS_DATA_DESTINATION,
  DATASETS_NAME,
} from "@home/config";
import fs from "fs/promises";
import path from "path";
import { Terminal } from "terminal-kit";

const VEGETABLES = [
  "beetroot",
  "bell pepper",
  "cabbage",
  "capsicum",
  "carrot",
  "cauliflower",
  "chilli pepper",
  "corn",
  "cucumber",
  "eggplant",
  "garlic",
  "ginger",
  "jalepeno",
  "lettuce",
  "onion",
  "paprika",
  "peas",
  "potato",
  "raddish",
  "soy beans",
  "spinach",
  "sweetcorn",
  "sweetpotato",
  "tomato",
  "turnip",
];

/* -------------------------------------------------------------------------- */
/*                             COMMON UTIL FUNCTIONS                          */
/* -------------------------------------------------------------------------- */

async function isRawDataExists(): Promise<boolean> {
  try {
    await fs.access(RAW_DATA_DESTINATION);
    return true;
  } catch {
    return false;
  }
}

async function countFiles(dir: string): Promise<number> {
  let count = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) count += await countFiles(fullPath);
    else count++;
  }
  return count;
}

async function copyWithProgress(
  sourceDir: string,
  targetDir: string,
  term: Terminal
): Promise<number> {
  const totalFiles = await countFiles(sourceDir);
  let filesProcessed = 0;

  const progressBar = term.progressBar({
    width: 80,
    title: "Copying files:",
    eta: true,
    percent: true,
    items: totalFiles,
  });

  async function copyDirectory(source: string, destination: string) {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(sourcePath, targetPath);
      } else {
        await fs.copyFile(sourcePath, targetPath);
        filesProcessed++;

        if (filesProcessed % 10 === 0 || filesProcessed === totalFiles) {
          progressBar.update({
            progress: filesProcessed / totalFiles,
            title: `Copying: ${path.relative(sourceDir, sourcePath)}`,
          });
          await new Promise((r) => setTimeout(r, 10));
        }
      }
    }
  }

  await copyDirectory(sourceDir, targetDir);
  term.green(`\n✓ Copied ${filesProcessed} files successfully\n`);
  return totalFiles;
}

async function prepareDatasetsDir(term: Terminal): Promise<boolean> {
  try {
    term.cyan(`\nPreparing dataset directory: ${DATASETS_DATA_DESTINATION}\n`);
    const splits = ["train", "test", "validation"];
    const categories = ["fruit", "vegetable"];

    for (const split of splits) {
      for (const category of categories) {
        const dir = path.join(DATASETS_DATA_DESTINATION, split, category);
        await fs.mkdir(dir, { recursive: true });
        term.green(`✓ Created directory: ${dir}\n`);
      }
    }

    term.green("✓ Dataset directories prepared successfully\n");
    return true;
  } catch (error) {
    term.red("❌ Error preparing dataset directories:\n", error);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                               DATASET ONE                                 */
/* -------------------------------------------------------------------------- */

async function prepareDatasetOne(term: Terminal): Promise<boolean> {
  try {
    term.clear();
    term.moveTo(1, 1);
    term.blue.bold("=== Dataset One Preparation ===\n\n");
    term.cyan(`📂 Dataset Name: ${DATASETS_NAME[0]}\n`);

    const sourceDir = RAW_DATA_DESTINATION;
    const targetDir = path.join(DATASETS_DATA_DESTINATION, DATASETS_NAME[0]);
    await fs.mkdir(targetDir, { recursive: true });

    await copyWithProgress(sourceDir, targetDir, term);

    term("\n");
    term.green.bold("✓ Dataset One preparation completed successfully!\n");
    term.blue.bold("──────────────────────────────────────────────\n\n");
    return true;
  } catch (error) {
    term.red("❌ Error preparing dataset one:\n", error);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                               DATASET TWO                                 */
/* -------------------------------------------------------------------------- */

async function prepareDatasetTwo(term: Terminal): Promise<boolean> {
  const sourceDir = RAW_DATA_DESTINATION;
  const targetDir = path.join(DATASETS_DATA_DESTINATION, DATASETS_NAME[1]);
  let filesProcessed = 0;
  let fruitCount = 0;
  let vegCount = 0;

  try {
    term.clear();
    term.moveTo(1, 1);
    term.blue.bold("=== Dataset Two Organization ===\n\n");
    term.cyan(`Source: ${sourceDir}\n`);
    term.cyan(`Destination: ${targetDir}\n\n`);

    // Count total files
    let totalFiles = 0;
    for (const split of ["train", "test"]) {
      const splitPath = path.join(sourceDir, split);
      try {
        const categories = await fs.readdir(splitPath);
        for (const category of categories) {
          const categoryPath = path.join(splitPath, category);
          const stats = await fs.stat(categoryPath);
          if (stats.isDirectory()) {
            const files = await fs.readdir(categoryPath);
            totalFiles += files.filter((f) =>
              /\.(jpg|jpeg|png)$/i.test(f)
            ).length;
          }
        }
      } catch {}
    }
    term.green(`Found ${totalFiles} image files\n\n`);

    const progressBar = term.progressBar({
      width: 80,
      title: "🔄 Loading and processing files...",
      eta: true,
      percent: true,
      items: totalFiles,
    });

    for (const split of ["train", "test"]) {
      for (const cat of ["fruit", "vegetable"]) {
        await fs.mkdir(path.join(targetDir, split, cat), { recursive: true });
      }
    }

    for (const split of ["train", "test"]) {
      const splitPath = path.join(sourceDir, split);
      const categories = await fs.readdir(splitPath);

      for (const category of categories) {
        const categoryPath = path.join(splitPath, category);
        const stats = await fs.stat(categoryPath);
        if (!stats.isDirectory()) continue;

        const isVeg = VEGETABLES.includes(category.toLowerCase());
        const targetCategory = isVeg ? "vegetable" : "fruit";
        const files = (await fs.readdir(categoryPath)).filter((f) =>
          /\.(jpg|jpeg|png)$/i.test(f)
        );

        for (const file of files) {
          const sourceFile = path.join(categoryPath, file);
          const extension = path.extname(file);
          const counter = isVeg ? ++vegCount : ++fruitCount;
          const newName = `${targetCategory}_${counter}${extension}`;
          const targetFile = path.join(
            targetDir,
            split,
            targetCategory,
            newName 
          );

          await fs.copyFile(sourceFile, targetFile);
          filesProcessed++;

          if (filesProcessed % 10 === 0 || filesProcessed === totalFiles) {
            const status = filesProcessed === totalFiles 
              ? '✅ Copied successfully!'
              : `📂 Processing: ${path.basename(path.dirname(sourceFile))}...`;
              
            progressBar.update({
              progress: filesProcessed / totalFiles,
              title: status,
            });
            await new Promise((r) => setTimeout(r, 10));
          }
        }
      }
    }

    // --- CLEANER SUMMARY + PROPER END ---
    term("\n\n");
    term.bold.blue("=== Dataset Two Summary ===\n\n");
    const totalTrain = Math.round(fruitCount * 0.8 + vegCount * 0.8);
    const totalTest = fruitCount + vegCount - totalTrain;

    term.table(
      [
        ["", "Train", "Test", "Total"],
        [
          "Fruits",
          `${Math.round(fruitCount * 0.8)}`,
          `${fruitCount - Math.round(fruitCount * 0.8)}`,
          `${fruitCount}`,
        ],
        [
          "Vegetables",
          `${Math.round(vegCount * 0.8)}`,
          `${vegCount - Math.round(vegCount * 0.8)}`,
          `${vegCount}`,
        ],
        ["Total", `${totalTrain}`, `${totalTest}`, `${fruitCount + vegCount}`],
      ],
      {
        hasBorder: true,
        borderChars: "lightRounded",
        borderAttr: { color: "blue" },
        width: 65,
        fit: true,
      }
    );

    term("\n");
    term.green.bold("✓ Dataset Two organization completed successfully!\n");

    return true;
  } catch (error) {
    term.red.bold("\n✗ Error preparing dataset two:\n", error);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                             MASTER PREPARATION                             */
/* -------------------------------------------------------------------------- */

async function prepareDataset(term: Terminal): Promise<boolean> {
  try {
    if (!(await isRawDataExists())) {
      term.red("Raw data directory not found.\n");
      return false;
    }

    if (!(await prepareDatasetsDir(term))) return false;

    await prepareDatasetOne(term);
    await prepareDatasetTwo(term);

    return true;
  } catch (error) {
    term.red("Error preparing dataset:", error);
    return false;
  }
}

async function validateDatasetStructure(datasetPath: string, term: Terminal): Promise<boolean> {
  try {
    term.cyan("\nValidating dataset structure...\n");
    
    const requiredDirs = [
      'train',
      'train/fruit',
      'train/vegetable',
      'validation',
      'validation/fruit',
      'validation/vegetable',
      'test',
      'test/fruit',
      'test/vegetable'
    ];

    // Check if all required directories exist
    for (const dir of requiredDirs) {
      const fullPath = path.join(datasetPath, dir);
      try {
        await fs.access(fullPath);
        term.green(`✓ Found directory: ${dir}\n`);
      } catch {
        term.yellow(`⚠️  Creating missing directory: ${dir}\n`);
        await fs.mkdir(fullPath, { recursive: true });
      }
    }

    // Check if there are files in train directory
    const trainFruitPath = path.join(datasetPath, 'train/fruit');
    const trainVegPath = path.join(datasetPath, 'train/vegetable');
    const valFruitPath = path.join(datasetPath, 'validation/fruit');
    const valVegPath = path.join(datasetPath, 'validation/vegetable');

    const [trainFruitFiles, trainVegFiles] = await Promise.all([
      fs.readdir(trainFruitPath),
      fs.readdir(trainVegPath)
    ]);

    // If validation directories are empty, move some files from train to val
    const valFruitFiles = await fs.readdir(valFruitPath).catch(() => []);
    const valVegFiles = await fs.readdir(valVegPath).catch(() => []);

    if (valFruitFiles.length === 0 && trainFruitFiles.length > 0) {
      term.cyan("\nCreating validation set for fruits...\n");
      // Move 20% of training fruits to validation
      const numToMove = Math.ceil(trainFruitFiles.length * 0.2);
      for (let i = 0; i < numToMove; i++) {
        const file = trainFruitFiles[i];
        if (file) {
          await fs.rename(
            path.join(trainFruitPath, file),
            path.join(valFruitPath, file)
          );
        }
      }
    }

    if (valVegFiles.length === 0 && trainVegFiles.length > 0) {
      term.cyan("\nCreating validation set for vegetables...\n");
      // Move 20% of training vegetables to validation
      const numToMove = Math.ceil(trainVegFiles.length * 0.2);
      for (let i = 0; i < numToMove; i++) {
        const file = trainVegFiles[i];
        if (file) {
          await fs.rename(
            path.join(trainVegPath, file),
            path.join(valVegPath, file)
          );
        }
      }
    }

    // Update data.yaml file
    const dataYamlPath = path.join(datasetPath, 'config', 'data.yaml');
    try {
      const dataYaml = `# Train/validation/test sets as 1) dir: path/to/imgs, 2) file: path/to/imgs.txt, or 3) list[path/to/imgs1, path/to/imgs2, ..]
path: ${datasetPath.replace(/\\/g, '/')}  # dataset root dir
train: train  # train images (relative to 'path') 128 images
val: validation  # val images (relative to 'path') 128 images
test: test  # test images (optional)

# Classes
names:
  0: fruit
  1: vegetable`;
      
      await fs.writeFile(dataYamlPath, dataYaml);
      term.green(`✓ Updated data.yaml configuration\n`);
    } catch (error) {
      term.yellow(`⚠️  Could not update data.yaml: ${error}\n`);
    }

    term.green("\n✓ Dataset structure validated and prepared successfully\n");
    return true;
  } catch (error) {
    term.red(`❌ Error validating dataset structure: ${error}\n`);
    return false;
  }
}

export {
  isRawDataExists,
  prepareDatasetsDir,
  prepareDatasetOne,
  prepareDatasetTwo,
  prepareDataset,
  validateDatasetStructure,
};
