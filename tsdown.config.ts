import { error } from "node:console";
import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	platform: "node",
	format: ["cjs", "esm"],
	dts: true,
	clean: true,
	sourcemap: true,
	deps: {
		neverBundle: [/^@aws-sdk\//, /^@smithy\//]
	},
	publint: {
		level: "error",
	},
	attw: {
		level: "error",
	},
});
