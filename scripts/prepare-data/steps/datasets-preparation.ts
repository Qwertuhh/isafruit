import {
  RAW_DATA_DESTINATION,
  DATASETS_DATA_DESTINATION,
  DATASETS_NAME,
} from "@home/config";
import type { ProgressBarController } from "terminal-kit/Terminal";
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

export {
  isRawDataExists,
  prepareDatasetsDir,
  prepareDatasetOne,
  prepareDatasetTwo,
  prepareDataset,
};
