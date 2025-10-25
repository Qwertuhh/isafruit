import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Terminal } from "terminal-kit";
import { validateDatasetStructure } from "./datasets-preparation";
import { BASE_MODEL, DATASETS_DATA_DESTINATION, MODEL_DATA_DESTINATION } from "@home/config";

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TrainModelOptions {
    dataYamlPath: string;
    outputDir: string;
    epochs?: number;
    batchSize?: number;
    model?: string;
    device?: string;
}

/**
 * Train a YOLOv8 model using the specified configuration
 * @param options - Training options
 * @param term - Terminal instance for output
 */
async function trainModel(
    options: TrainModelOptions,
    term: Terminal
): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        try {
            term.cyan("🚀 Starting model training...\n");

            // Convert all paths to absolute
            const scriptPath = path.resolve(
                __dirname,
                "../../../services/model/train-model/main.py"
            );
            
            const dataYamlPath = path.resolve(options.dataYamlPath);
            const outputDir = path.resolve(options.outputDir);
            const modelPath = options.model ? path.resolve(options.model) : 'yolov8n.pt';

            // Verify paths exist
            try {
                await fs.access(scriptPath);
                await fs.access(dataYamlPath);
                if (options.model) await fs.access(modelPath);
            } catch (error) {
                term.red(`❌ Error: ${error}\n`);
                return reject(error);
            }

            const args = [
                scriptPath,
                `--data=${dataYamlPath}`,
                `--output=${outputDir}`,
                `--epochs=${options.epochs || 100}`,
                `--batch=${options.batchSize || 16}`,
                `--model=${modelPath}`,
                `--device=${options.device || '0'}`
            ];

            const command = `uv run ${args.map(arg => `"${arg}"`).join(' ')}`;
            term.cyan(`Running: ${command}\n\n`);

            const pythonProcess = spawn("uv", ["run", ...args], {
                stdio: ["inherit", "pipe", "pipe"],
                shell: true,
                cwd: path.dirname(scriptPath) // Run from script's directory
            });

            // Forward Python output to terminal
            pythonProcess.stdout?.on("data", (data) => {
                term.gray(data.toString());
            });

            pythonProcess.stderr?.on("data", (data) => {
                term.yellow(data.toString());
            });

            pythonProcess.on("close", (code) => {
                if (code === 0) {
                    term.green("\n✅ Model training completed successfully!\n");
                    resolve(true);
                } else {
                    term.red(`\n❌ Model training failed with code ${code}\n`);
                    resolve(false);
                }
            });

            pythonProcess.on("error", (error) => {
                term.red(`\n❌ Error during model training: ${error.message}\n`);
                resolve(false);
            });
        } catch (error) {
            term.red(`\n❌ Unexpected error during model training: ${error}\n`);
            resolve(false);
        }
    });
}

/**
 * Main function to train the model
 * @param datasetDir - Directory containing the dataset
 * @param outputDir - Directory to save the trained model
 * @param term - Terminal instance for output
 */
async function prepareModel(
    datasetDir: string,
    outputDir: string,
    term: Terminal
): Promise<boolean> {
    try {
        // Convert to absolute paths
        const absoluteDatasetDir = path.resolve(datasetDir);
        const absoluteOutputDir = path.resolve(outputDir);
        const absoluteModelPath = path.resolve(MODEL_DATA_DESTINATION, BASE_MODEL);
        const dataYamlPath = path.join(absoluteDatasetDir, "config",'data.yaml');
        
        // Verify data.yaml exists and validate dataset structure
        try {
            await fs.access(dataYamlPath);
            
            // Validate and prepare dataset structure
            const datasetDir = path.dirname(path.dirname(dataYamlPath));
            const isValid = await validateDatasetStructure(datasetDir, term);
            
            if (!isValid) {
                term.red("❌ Error: Dataset validation failed. Please check the dataset structure.\n");
                return false;
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to validate dataset structure';
            term.red(`❌ Error: ${errorMessage}\n`);
            return false;
        }
        
        const options: TrainModelOptions = {
            dataYamlPath,
            outputDir: absoluteOutputDir,
            epochs: 100,
            batchSize: 16,
            model: absoluteModelPath,
            device: 'cpu'  // Default to first GPU, set to 'cpu' if no GPU available
        };

        term.cyan(`📁 Dataset directory: ${absoluteDatasetDir}\n`);
        term.cyan(`📁 Output directory: ${absoluteOutputDir}\n`);
        term.cyan(`🤖 Model: ${absoluteModelPath}\n\n`);

        return await trainModel(options, term);
    } catch (error) {
        term.red(`❌ Error in prepareModel: ${error instanceof Error ? error.message : String(error)}\n`);
        return false;
    }
}

export { prepareModel };