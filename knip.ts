import type { KnipConfig } from "knip";

const configuration: KnipConfig = {
	biome: true,
	bumpp: true,
	bun: true,
	changelogithub: true,
	commitlint: true,
	ignore: ["src/index.test-d.ts"],
	ignoreBinaries: ["lefthook"],
	ignoreDependencies: ["changelogithub"],
	lefthook: true,
	oxlint: true,
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
};

export default configuration;
