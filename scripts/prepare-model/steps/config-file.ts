import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import { Terminal } from "terminal-kit";
import { DataYamlConfig } from "@home/types";
import { DATASETS_DATA_DESTINATION, DATASETS_NAME } from "@home/config";

/**
 * Get class names from the dataset directory
 * @param datasetDir - Root directory containing the dataset
 * @returns Array of class names
 */
async function getClassNames(datasetDir: string): Promise<string[]> {
  const trainDir = path.join(datasetDir, 'train');
  try {
    const entries = await fs.readdir(trainDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(dir => dir.name)
      .sort();
  } catch (error) {
    console.error(`Error reading class directories: ${error}`);
    return [];
  }
}

/**
 * Creates a data.yaml configuration file for YOLO training
 * @param trainDir - Absolute path to the training images directory
 * @param valDir - Absolute path to the validation images directory
 * @param outputPath - Absolute path where to save the data.yaml file
 * @param classNames - Array of class names
 */
async function createDataYaml(
  trainDir: string,
  valDir: string,
  outputPath: string,
  classNames: string[]
): Promise<void> {
  // Convert to absolute paths
  const absoluteTrainPath = path.resolve(trainDir);
  const absoluteValPath = path.resolve(valDir);

  const config: DataYamlConfig = {
    train: absoluteTrainPath,
    val: absoluteValPath,
    nc: classNames.length,
    names: classNames,
  };

  const yamlStr = yaml.dump(config);
  await fs.writeFile(outputPath, yamlStr, 'utf8');
}

/**
 * Main function to generate data.yaml for dataset
 * @param datasetDir - Root directory containing 'train' and 'val' folders
 * @param outputDir - Directory where to save the data.yaml file
 * @param term - Terminal instance for output
 */
async function generateDataYaml(
  datasetDir: string,
  outputDir: string,
  term: Terminal
): Promise<boolean> {
  try {
    term.cyan("Generating data.yaml configuration...\n");

    // Define paths
    const trainDir = path.join(datasetDir, 'train');
    const valDir = path.join(datasetDir, 'val');
    const outputPath = path.join(outputDir, 'data.yaml');

    // Ensure directories exist
    await fs.mkdir(outputDir, { recursive: true });

    // Get class names from the train directory structure
    const classNames = await getClassNames(datasetDir);
    
    if (classNames.length === 0) {
      term.yellow("⚠️ No class directories found in the train folder. Using default classes.\n");
      classNames.push('fruit', 'vegetable');
    } else {
      term.cyan(`Found ${classNames.length} classes: ${classNames.join(', ')}\n`);
    }

    // Create the data.yaml file with absolute paths
    await createDataYaml(trainDir, valDir, outputPath, classNames);

    term.green(`✅ data.yaml generated successfully at: ${outputPath}\n`);
    return true;
  } catch (error) {
    term.red(`❌ Error generating data.yaml: ${error}\n`);
    return false;
  }
}

async function prepareConfigFile(term: Terminal): Promise<boolean> {
  try {
    term.cyan("Preparing config file...\n");
    
    for (let i = 0; i < DATASETS_NAME.length; i++) {
      const datasetPath = path.join(DATASETS_DATA_DESTINATION, DATASETS_NAME[i]);
      const outputConfigPath = path.join(datasetPath, 'config');
      
      term.cyan(`\nProcessing dataset: ${DATASETS_NAME[i]}\n`);
      term.cyan(`Dataset path: ${datasetPath}\n`);
      
      await generateDataYaml(
        datasetPath,
        outputConfigPath,
        term
      );
      
      // Log the absolute path of the generated config file
      const configFilePath = path.join(outputConfigPath, 'data.yaml');
      term.green(`✅ Config generated at: ${path.resolve(configFilePath)}\n`);
    }
    
    term.green("\n✅ All config files prepared successfully\n");
    return true;
  } catch (error) {
    term.red(`❌ Error preparing config file: ${error}\n`);
    if (error instanceof Error) {
      term.red(`Error details: ${error.stack}\n`);
    }
    return false;
  }
}

export { prepareConfigFile };
