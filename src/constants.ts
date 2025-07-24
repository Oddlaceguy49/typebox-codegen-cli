import * as Codegen from "@sinclair/typebox-codegen";

export const GENERATORS = {
	typebox: Codegen.TypeScriptToTypeBox,
	zod: Codegen.ModelToZod,
	valibot: Codegen.ModelToValibot,
	yup: Codegen.ModelToYup,
	effect: Codegen.ModelToEffect,
	jsonschema: Codegen.ModelToJsonSchema,
	types: "types",
};

export type Target = keyof typeof GENERATORS;
