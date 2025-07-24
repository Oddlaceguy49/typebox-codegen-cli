import fs from "node:fs/promises";
import path from "node:path";
import * as Codegen from "@sinclair/typebox-codegen";
import { glob } from "glob";
import { transformSourceText } from "./astTransformer.js";
import { generateBarrelFiles } from "./barrelGenerator.js";
import { GENERATORS, type Target } from "./constants.js";
import { fixEsmImports } from "./importFixer.js";

// This is the main function, which takes the parsed CLI arguments
export async function runGeneration(options: {
	target: Target;
	inputDir: string;
	outputDir: string;
	clean: boolean;
	fixImports: boolean;
}) {
	const { target, inputDir, outputDir, clean, fixImports } = options;

	if (!GENERATORS[target]) {
		throw new Error(
			`Invalid target: ${target}. Available targets are: ${Object.keys(
				GENERATORS,
			).join(", ")}`,
		);
	}

	const baseOutputDir = path.join(outputDir, target.toLowerCase());
	const schemaOutputDir = path.join(baseOutputDir, "types");

	if (clean) {
		console.log(`\n🧹 Cleaning up previous output in ${baseOutputDir}...`);
		await fs.rm(baseOutputDir, { recursive: true, force: true });
		console.log("   -> Cleanup complete.");
	}

	const inputFiles = await glob(`${inputDir}/**/*.ts`);
	if (inputFiles.length === 0) {
		console.warn(`⚠️ No TypeScript files found in ${inputDir}. Exiting.`);
		return;
	}

	await fs.mkdir(schemaOutputDir, { recursive: true });
	console.log(`\nFound ${inputFiles.length} files to process...`);

	for (const inputFile of inputFiles) {
		const relativePath = path.relative(inputDir, inputFile);
		const outputFile = path.join(schemaOutputDir, relativePath);
		console.log(`- Processing ${inputFile} -> ${outputFile}`);
		await fs.mkdir(path.dirname(outputFile), { recursive: true });

		const sourceText = await fs.readFile(inputFile, "utf-8");
		const transformedSourceText = await transformSourceText(
			sourceText,
			inputFile,
		);
		let generatedCode: string = "";

		const selectedGenerator = GENERATORS[target];
		if (target === "typebox") {
			generatedCode = Codegen.TypeScriptToTypeBox.Generate(
				transformedSourceText,
			);
		} else if (target === "types") {
			generatedCode = transformedSourceText;
		} else {
			const model = Codegen.TypeScriptToModel.Generate(transformedSourceText);
			generatedCode = (selectedGenerator as any).Generate(model);
		}

		// Your post-generation fixups
		if (target === "zod") {
			generatedCode = generatedCode.replace(
				/z\.recordKATEX_INLINE_OPEN([^)]+)KATEX_INLINE_CLOSE/g,
				"z.record(z.string(), $1)",
			);
		} else if (target === "yup") {
			generatedCode = generatedCode.replace(
				"import y from 'yup'",
				"import * as y from 'yup'",
			);
		}
		// ... add other fixups here ...

		const combinedOutput = `// THIS FILE IS AUTO-GENERATED FOR ${target.toUpperCase()}. DO NOT EDIT.\n\n${generatedCode}`;
		await fs.writeFile(outputFile, combinedOutput);
	}

	console.log(`\n✅ Schema file generation for ${target} complete!`);
	console.log(`   Output directory: ${schemaOutputDir}`);

	await generateBarrelFiles(baseOutputDir, schemaOutputDir, inputFiles);

	if (fixImports) {
		fixEsmImports(baseOutputDir);
	}
}
