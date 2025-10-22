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

async function isRawDataExists(): Promise<boolean> {
  try {
    await fs.access(RAW_DATA_DESTINATION);
    return true;
  } catch {
    return false;
  }
}

async function prepareDatasetOne(term: Terminal): Promise<boolean> {
  let progressBar: ProgressBarController | null = null;
  let totalFiles = 0;
  let filesProcessed = 0;

  try {
    // Clear the terminal and set up initial display
    term.clear();
    term.moveTo(1, 1);

    // Show initial message
    term.cyan(
      `📂 Preparing dataset directory: ${DATASETS_DATA_DESTINATION}\n\n`
    );

    const sourceDir = path.join(RAW_DATA_DESTINATION);
    const targetDir = path.join(DATASETS_DATA_DESTINATION, DATASETS_NAME[0]);
    await fs.mkdir(targetDir, { recursive: true });

    // First, count all files to be copied
    term("Counting files... ");
    const countFiles = async (dir: string): Promise<number> => {
      let count = 0;
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          count += await countFiles(fullPath);
        } else {
          count++;
        }
      }
      return count;
    };

    totalFiles = await countFiles(sourceDir);
    term.green(`Found ${totalFiles} files to copy\n\n`);

    // Create progress bar
    progressBar = term.progressBar({
      width: 80,
      title: "Copying files:",
      eta: true,
      percent: true,
      items: totalFiles,
    });

    const copyDirectory = async (source: string, destination: string) => {
      await fs.mkdir(destination, { recursive: true });
      const entries = await fs.readdir(source, { withFileTypes: true });

      for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const targetPath = path.join(destination, entry.name);

        if (entry.isDirectory()) {
          await copyDirectory(sourcePath, targetPath);
        } else {
          await fs.copyFile(sourcePath, targetPath);

          // Update progress
          filesProcessed++;
          if (filesProcessed % 10 === 0 || filesProcessed === totalFiles) {
            progressBar?.update({
              progress: filesProcessed / totalFiles,
              title: `Copying: ${path.relative(sourceDir, sourcePath)}`,
            });
            // Small delay to allow UI updates
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }
      }
    };

    // Start the copy process
    await copyDirectory(sourceDir, targetDir);

    // Clear progress bar and show completion message
    term("\n\n");
    term.green(
      `✓ Successfully copied ${filesProcessed} files to ${targetDir}\n`
    );
    return true;
  } catch (error) {
    term.red("❌ Error preparing dataset directories:\n");
    term.red(error);
    return false;
  }
}

async function prepareDatasetsDir(term: Terminal): Promise<boolean> {
  try {
    term.cyan(`\nPreparing dataset directory: ${DATASETS_DATA_DESTINATION}\n`);

    // Create train, test, and validation directories with fruit/vegetable subdirectories
    const splits = ["train", "test", "validation"];
    const categories = ["fruit", "vegetable"];

    for (const split of splits) {
      const splitPath = path.join(DATASETS_DATA_DESTINATION, split);
      await fs.mkdir(splitPath, { recursive: true });

      // Create fruit and vegetable subdirectories for each split
      for (const category of categories) {
        const categoryPath = path.join(splitPath, category);
        await fs.mkdir(categoryPath, { recursive: true });
        term.green(`✓ Created directory: ${categoryPath}\n`);
      }
    }

    term.green("✓ Dataset directories prepared successfully\n");
    return true;
  } catch (error) {
    term.red("❌ Error preparing dataset directories:\n");
    term.red(error);
    return false;
  }
}

async function copyAndOrganizeDataset(term: Terminal): Promise<boolean> {
  let progressBar: ProgressBarController | null = null;
  let filesProcessed = 0;
  let totalFiles = 0;

  try {
    // Use the archive directory as source
    const sourceDir = RAW_DATA_DESTINATION;
    const targetDir = path.resolve(DATASETS_DATA_DESTINATION, DATASETS_NAME[1]);

    // Clear any existing output
    term.clear();
    term.moveTo(1, 1);

    // Display header
    term.blue.bold("=== Dataset Organization ===\n\n");
    term.cyan(`Source: ${sourceDir}\n`);
    term.cyan(`Destination: ${targetDir}\n\n`);

    // First, count total number of files to process
    term("Counting files... ");
    for (const split of ["train", "test"]) {
      const splitPath = path.join(sourceDir, split);
      try {
        const categories = await fs.readdir(splitPath);
        for (const category of categories) {
          const categoryPath = path.join(splitPath, category);
          const stats = await fs.stat(categoryPath);
          if (stats.isDirectory()) {
            const files = await fs.readdir(categoryPath);
            totalFiles += files.filter((file) =>
              /\.(jpg|jpeg|png)$/i.test(file)
            ).length;
          }
        }
      } catch (error) {
        term.red(`Error counting files in ${split}: ${error}\n`);
      }
    }
    term.green(`Found ${totalFiles} images to process\n\n`);

    // Create progress bar with sync mode for better performance
    progressBar = term.progressBar({
      width: 80,
      title: "Processing:",
      eta: true,
      percent: true,
    });

    // Ensure target directories exist
    await fs.mkdir(path.join(targetDir, "train", "fruit"), { recursive: true });
    await fs.mkdir(path.join(targetDir, "train", "vegetable"), {
      recursive: true,
    });
    await fs.mkdir(path.join(targetDir, "test", "fruit"), { recursive: true });
    await fs.mkdir(path.join(targetDir, "test", "vegetable"), {
      recursive: true,
    });

    let fruitCount = 0;
    let vegCount = 0;

    // Process both train and test directories
    for (const split of ["train", "test"]) {
      const splitPath = path.join(sourceDir, split);

      try {
        const categories = await fs.readdir(splitPath);

        for (const category of categories) {
          const categoryPath = path.join(splitPath, category);
          const stats = await fs.stat(categoryPath);

          if (!stats.isDirectory()) continue;

          const isVegetable = VEGETABLES.includes(category.toLowerCase());
          const targetCategory = isVegetable ? "vegetable" : "fruit";

          const files = await fs.readdir(categoryPath);
          const imageFiles = files.filter((file) =>
            /\.(jpg|jpeg|png)$/i.test(file)
          );

          for (const file of imageFiles) {
            try {
              const sourceFile = path.join(categoryPath, file);
              const extension = path.extname(file);
              const counter = isVegetable ? ++vegCount : ++fruitCount;
              const newFileName = `${targetCategory}_${counter}${extension}`;
              const targetFile = path.join(
                targetDir,
                split,
                targetCategory,
                newFileName
              );

              // Ensure target directory exists
              await fs.mkdir(path.dirname(targetFile), { recursive: true });

              // Copy file
              await fs.copyFile(sourceFile, targetFile);

              // Update progress
              filesProcessed++;

              // Only update the progress bar every 10 files to reduce redraws
              if (filesProcessed % 10 === 0 || filesProcessed === totalFiles) {
                progressBar.update({
                  progress: filesProcessed / totalFiles,

                  title: `Copying: ${path.relative(sourceDir, sourceFile)}`,
                });

                // Small delay to allow the UI to update
                await new Promise((resolve) => setTimeout(resolve, 10));
              }
            } catch (fileError) {
              term.red(`\nError copying file ${file}: ${fileError}\n`);
              continue;
            }
          }
        }
      } catch (error) {
        term.red(`\nError processing ${split} directory: ${error}\n`);
        continue;
      }
    }

    // Clear progress bar and show summary
    term("\n\n");

    // Create a summary table
    term.bold.blue("=== Dataset Summary ===\n\n");

    // Calculate train/test split (assuming 80/20 split)
    const trainFruit = Math.round(fruitCount * 0.8);
    const testFruit = fruitCount - trainFruit;
    const trainVeg = Math.round(vegCount * 0.8);
    const testVeg = vegCount - trainVeg;

    // Create and display the table
    term.table(
      [
        ["", "Train", "Test", "Total"],
        [
          "Fruits",
          trainFruit.toString(),
          testFruit.toString(),
          fruitCount.toString(),
        ],
        [
          "Vegetables",
          trainVeg.toString(),
          testVeg.toString(),
          vegCount.toString(),
        ],
        [
          "Total",
          (trainFruit + trainVeg).toString(),
          (testFruit + testVeg).toString(),
          (fruitCount + vegCount).toString(),
        ],
      ],
      {
        hasBorder: true,
        borderChars: "lightRounded",
        borderAttr: { color: "blue" },
        width: 60,
        fit: true,
      }
    );

    term("\n");
    term.green.bold("✓ Dataset organization complete!\n");
    term.cyan(
      `Successfully processed ${
        fruitCount + vegCount
      } images (${fruitCount} fruits, ${vegCount} vegetables)\n`
    );
    return true;
  } catch (error) {
    if (progressBar) {
      term("\n\n");
    }
    term.red.bold("✗ Error copying and organizing dataset:\n");
    term.red(`${error}\n`);
    return false;
  }
}

async function prepareDataset(term: Terminal): Promise<boolean> {
  try {
    if (await isRawDataExists()) {
      if (await prepareDatasetsDir(term)) {
        await prepareDatasetOne(term);

        if (await copyAndOrganizeDataset(term)) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    term.red("Error preparing dataset:", error);
    return false;
  }
}

export {
  isRawDataExists,
  prepareDatasetsDir,
  copyAndOrganizeDataset,
  prepareDataset,
};
