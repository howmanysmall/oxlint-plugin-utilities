import type { KnipConfig } from "knip";

const configuration: KnipConfig = {
	biome: true,
	bumpp: true,
	changelogithub: true,
	commitlint: true,
	ignoreBinaries: ["nr"],
	ignoreDependencies: ["skills"],
	ignoreFiles: ["**/reset.d.ts"],
	oxlint: true,
	pnpm: true,
	project: ["src/**/*.ts", "scripts/**/*.ts"],
	rules: {
		binaries: "error",
		catalog: "error",
		dependencies: "error",
		devDependencies: "error",
		duplicates: "error",
		enumMembers: "error",
		exports: "error",
		files: "error",
		nsExports: "error",
		nsTypes: "error",
		optionalPeerDependencies: "error",
		types: "error",
		unlisted: "error",
		unresolved: "error",
	},
	typescript: {
		config: ["tsconfig.json", "tsconfig.base.json"],
	},
	vitest: true,
};

export default configuration;
