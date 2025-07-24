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
			const recordRegex = /z\.record\(([^)]+)\)/g;
			const recordReplacement = "z.record(z.string(), $1)";
			generatedCode = generatedCode.replace(recordRegex, recordReplacement);
		} else if (target === "yup") {
			generatedCode = generatedCode.replace(
				"import y from 'yup'",
				"import * as y from 'yup'",
			);
		} else if (target === "effect") {
			// Pass 1: Convert modern ES.Record(Key, Value) to the old object syntax.
			// This regex handles nested parentheses in the value part.
			const modernRecordRegex =
				/ES\.Record\(([^,]+),\s*((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*)\)/g;
			const modernRecordReplacement = "ES.Record({ key: $1, value: $2 })";
			generatedCode = generatedCode.replace(
				modernRecordRegex,
				modernRecordReplacement,
			);

			// Pass 2: Convert simple ES.Record(Value) to the old object syntax.
			// This regex explicitly avoids matching if the argument is an object literal '{...}'
			// to prevent double-replacing the output from Pass 1.
			const simpleRecordRegex = /ES\.Record\(([^){},]+)\)/g;
			const simpleRecordReplacement =
				"ES.Record({ key: ES.String, value: $1 })";
			generatedCode = generatedCode.replace(
				simpleRecordRegex,
				simpleRecordReplacement,
			);

			// Replaces the modern @effect/schema import with the older path
			generatedCode = generatedCode.replaceAll("@effect/schema", "effect");
		} /*else if (target === "arktype") { // Still broken
			console.log("\n🔧 Fixing up generated ArkType code...");

			generatedCode = generatedCode.replace(
				/^(\s*\w+\s*:\s*)('(?:\w+)'|\w+)\[\](,?)/gm,
				"// @ts-expect-error\n$1'$2[]'$3",
			);

			generatedCode = generatedCode.replace(
				/^(\s*\w+\s*:\s*)'(\w+\[\])'(,?)/gm,
				"// @ts-expect-error\n$1'$2'$3",
			);
		}*/

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
