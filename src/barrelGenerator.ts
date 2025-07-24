import fs from "node:fs/promises";
import path from "node:path";

async function generateSingleBarrelFile(
	baseOutputDir: string,
	generatedFile: string,
	fileName: string,
	exportRegex: RegExp,
) {
	const sourceFileContent = await fs.readFile(generatedFile, "utf-8");
	const allMatches = [...sourceFileContent.matchAll(exportRegex)];
	const exportedNames = [...new Set(allMatches.map((match) => match[1]))];

	if (exportedNames.length === 0) {
		return; // No matching exports, so don't create an empty barrel file
	}

	const relativePath = path
		.relative(baseOutputDir, generatedFile)
		.replace(/\\/g, "/")
		.replace(/\.ts$/, "");

	const fileContent = `// THIS FILE IS AUTO-GENERATED. DO NOT EDIT.\n\nexport {\n\t${exportedNames.join(
		",\n\t",
	)},\n} from "./${relativePath}";\n\n`;

	const filePath = path.join(baseOutputDir, fileName);
	await fs.writeFile(filePath, fileContent);
	console.log(`   -> ✅ ${fileName} barrel file generated.`);
}

export async function generateBarrelFiles(
	baseOutputDir: string,
	schemaOutputDir: string,
	inputFiles: string[],
) {
	console.log(`\n📦 Generating barrel files...`);

	const indexExportRegex =
		/export\s+(?:const|type|interface)\s+([A-Za-z0-9_]+?)(?<!_properties_[A-Za-z0-9_]+)\s*(?:=|{)/g;
	const detailsExportRegex =
		/export\s+(?:const|type|interface)\s+([A-Za-z0-9_]+_properties_[A-Za-z0-9_]+)\s*(?:=|{)/g;

	for (const inputFile of inputFiles) {
		const interfaceName = path.basename(inputFile, ".ts");
		const interfaceOutputDir = path.join(baseOutputDir, interfaceName);
		const generatedFilePath = path.join(schemaOutputDir, `${interfaceName}.ts`);

		try {
			await fs.access(generatedFilePath);
		} catch {
			console.log(
				`   -> Source file not found for ${interfaceName} in output. Skipping barrel generation.`,
			);
			continue;
		}

		await fs.mkdir(interfaceOutputDir, { recursive: true });
		console.log(`   -> Generating barrels for ${interfaceName}...`);

		await generateSingleBarrelFile(
			interfaceOutputDir,
			generatedFilePath,
			"index.ts",
			indexExportRegex,
		);
		await generateSingleBarrelFile(
			interfaceOutputDir,
			generatedFilePath,
			"details.ts",
			detailsExportRegex,
		);
	}
}
