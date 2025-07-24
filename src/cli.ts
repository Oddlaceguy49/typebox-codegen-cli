#!/usr/bin/env node

import { cosmiconfig } from "cosmiconfig";
import path from "path";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import type { Config, GenerationTask } from "./config.js";
import { GENERATORS } from "./constants.js";
import { runGeneration } from "./generator.js";

// Initialize cosmiconfig search
const explorer = cosmiconfig("codegencli");

yargs(hideBin(process.argv))
	.command(
		"$0 [target]", // Make the target optional
		"Generate schemas from TypeScript types using a config file or direct command.",
		(yargs) => {
			return yargs
				.positional("target", {
					describe: "The target schema format (if not using a config file)",
					type: "string",
					choices: Object.keys(GENERATORS),
				})
				.option("input", {
					alias: "i",
					type: "string",
					describe: "Input directory (overrides config file)",
				})
				.option("output", {
					alias: "o",
					type: "string",
					describe: "Base output directory (overrides config file)",
				});
			// ... other options like --clean, --fix-imports ...
		},
		async (argv) => {
			try {
				if (argv.target) {
					// --- LEGACY MODE: A target was provided on the command line ---
					console.log(`🚀 Running in single-target mode for: ${argv.target}`);
					const options = {
						target: argv.target,
						inputDir: path.resolve(process.cwd(), argv.input || "src/types"),
						outputDir: path.resolve(
							process.cwd(),
							argv.output || "src/generated",
						),
						clean: true, // You can get these from argv too
						fixImports: true,
					};
					await runGeneration(options as any);
				} else {
					// --- CONFIG MODE: No target provided, search for config file ---
					console.log("🔍 No target specified, searching for a config file...");
					const result = await explorer.search();

					if (!result) {
						console.error(
							"❌ Error: No config file found and no target specified.",
						);
						console.error(
							"Please either create a codegen.config.js file or run the command with a target (e.g., `typebox-codegen-cli zod`).",
						);
						process.exit(1);
					}

					console.log(`✅ Found config file at: ${result.filepath}`);
					const config: Config = result.config;

					if (!config.tasks || config.tasks.length === 0) {
						console.error(
							"❌ Error: The config file must contain a `tasks` array with at least one task.",
						);
						process.exit(1);
					}

					for (const task of config.tasks) {
						console.log(`\n🚀 Running task for target: ${task.target}`);
						const options = {
							target: task.target,
							// Command-line args override config file args, which override defaults
							inputDir: path.resolve(
								process.cwd(),
								argv.input || task.input || config.input || "src/types",
							),
							outputDir: path.resolve(
								process.cwd(),
								argv.output || task.output || config.output || "src/generated",
							),
							clean: true,
							fixImports: true,
						};
						await runGeneration(options as any);
					}
				}

				console.log("\n🎉 All tasks completed successfully!");
			} catch (error) {
				console.error("\n❌ A critical error occurred during generation:");
				console.error(error);
				process.exit(1);
			}
		},
	)
	.help()
	.alias("h", "help")
	.parse();
