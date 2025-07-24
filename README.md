# Typebox Codegen CLI

[![npm version](https://img.shields.io/npm/v/typebox-codegen-cli.svg?style=flat-square)](https://www.npmjs.com/package/typebox-codegen-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

A powerful CLI wrapper for [`typebox-codegen`](https://github.com/sinclairzx87/typebox-codegen) to automatically generate validation schemas from your TypeScript types.

This tool streamlines your workflow by taking your TypeScript interfaces as the single source of truth and generating schemas for various validation libraries. It goes beyond the standard codegen by applying automated post-processing fixes to ensure compatibility with modern library versions and coding standards.

## Key Features

-   **Multi-Library Support**: Generate schemas for Zod, Yup, Valibot, Effect, and more from a single command.
-   **Automated Code Fixes**: Applies patches to generated code, such as updating Zod v3 syntax to be compatible with v4 records.
-   **AST-Powered Transformations**: Intelligently flattens nested TypeScript `interface` properties into separate, named types for cleaner and more reusable schemas.
-   **Automatic Barrel Files**: Creates `index.ts` and `details.ts` barrel files for easy and organized importing of your generated schemas.
-   **ESM-Ready**: Automatically fixes relative import paths by appending the `.js` extension, making the output compatible with modern Node.js modules.
-   **Simple CLI Interface**: A clean and easy-to-use command-line interface with sensible defaults.

## Installation

Install the tool as a development dependency in your project:

```bash
npm install --save-dev typebox-codegen-cli
```

## Usage

The most common way to use this tool is by adding scripts to your `package.json` file.

### In `package.json`

```json
{
    "scripts": {
        "schema:zod": "typebox-codegen-cli zod",
        "schema:yup": "typebox-codegen-cli yup --input ./src/api-types --output ./src/generated-schemas",
        "schema:all": "npm run schema:zod && npm run schema:yup"
    }
}
```

Then you can run the commands in your terminal:

```bash
# Generate Zod schemas using default paths
npm run schema:zod

# Generate Yup schemas with custom input/output paths
npm run schema:yup
```

## Configuration File

For more complex projects, you can define all your generation tasks in a single configuration file. Create a `codegen.config.js` or `codegen.config.ts` file in your project's root directory.

When this file exists, you can simply run the command without any arguments:

```bash
npx typebox-codegen-cli
```

### Example `codegen.config.ts`

```typescript
// To get type-safety and autocompletion, you can optionally import the helper
// Note: You may need to add `"moduleResolution": "bundler"` to your tsconfig.json
// if you get an error importing this type.
import { defineConfig } from "typebox-codegen-cli/config";

export default defineConfig({
    // Global settings that apply to all tasks unless overridden
    input: "src/api-types",
    output: "src/generated",

    // An array of generation tasks to run
    tasks: [
        {
            target: "zod",
        },
        {
            target: "yup",
        },
        {
            // This task overrides the global output directory
            target: "jsonschema",
            output: "public/schemas",
        },
    ],
});
```

### Command-Line Options

| Option          | Alias | Description                                             | Default         |
| :-------------- | :---- | :------------------------------------------------------ | :-------------- |
| `target`        |       | **(Required)** The target schema format.                |                 |
| `--input`       | `-i`  | Input directory containing TypeScript type definitions. | `src/types`     |
| `--output`      | `-o`  | Base output directory for all generated files.          | `src/generated` |
| `--clean`       |       | Clean the output directory before generating.           | `true`          |
| `--fix-imports` |       | Append `.js` to relative imports for ESM compatibility. | `true`          |
| `--help`        | `-h`  | Show the help message.                                  |                 |

## Supported Targets

-   [ ] ArkType
-   [x] Effect
-   [ ] io-ts
-   [ ] Javascript Transform
-   [x] JSON Schema
-   [x] TypeBox
-   [ ] Typescript Transform
-   [x] Valibot
-   [ ] Value Transform
-   [x] Yup
-   [ ] Yrel
-   [x] Zod

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
