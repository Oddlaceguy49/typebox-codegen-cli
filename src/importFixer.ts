import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sync } from "glob";

export function fixEsmImports(baseDir: string) {
	console.log("\n🔧 Fixing relative import paths for ESM compatibility...");
	console.log(`  Searching in: ${baseDir}`);

	const files = sync("**/*.ts", { cwd: baseDir, nodir: true });
	console.log(`  Found ${files.length} files to check.`);

	let filesFixed = 0;
	const regex = /(from\s+['"])((\.?\.?\/)[^'"]+)(['"];?)/g;

	files.forEach((file) => {
		const filePath = join(baseDir, file);
		const content = readFileSync(filePath, "utf8");
		let fileContentChanged = false;

		const newContent = content.replace(regex, (match, p1, p2, p3, p4) => {
			if (
				(p2.startsWith("./") || p2.startsWith("../")) &&
				!/\.[^/]+$/.test(p2)
			) {
				fileContentChanged = true;
				return `${p1}${p2}.js${p4}`;
			}
			return match;
		});

		if (fileContentChanged) {
			writeFileSync(filePath, newContent, "utf8");
			filesFixed++;
		}
	});

	console.log(`✅ Fixed imports in ${filesFixed} files.`);
}
