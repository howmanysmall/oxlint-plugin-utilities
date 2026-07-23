import { defineConfig } from "tsdown";

import packageJson from "./package.json" with { type: "json" };
import { createBuildMetadataPlugin } from "./scripts/plugins/build/build-metadata.ts";
import { createPreserveCommentsPlugin } from "./scripts/plugins/build/preserve-comments.ts";

const configuration = defineConfig((options) => {
	const sourcemap = Boolean(options.sourcemap);

	return {
		attw: {
			profile: "esm-only",
		},
		clean: true,
		dts: {
			compilerOptions: {
				declarationMap: sourcemap,
			},
			sourcemap,
		},
		entry: { index: "./src/index.ts" },
		fixedExtension: false,
		format: ["esm"],
		outDir: "dist",
		outputOptions: {
			comments: {
				annotation: true,
				jsdoc: true,
				legal: true,
			},
		},
		platform: "node",
		plugins: [
			createBuildMetadataPlugin({ version: packageJson.version }),
			createPreserveCommentsPlugin({ enabled: true }),
		],
		publint: true,
		sourcemap,
		tsconfig: "./tsconfig.json",
	};
});

export default configuration;
