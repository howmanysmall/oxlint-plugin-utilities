import { defineConfig } from "vitest/config";

const configuration = defineConfig({
	test: {
		environment: "node",
		include: ["tests/**"],
		typecheck: {
			checker: "tsgo",
			enabled: true,
			include: ["tests/**/*.test-d.ts"],
			tsconfig: "./tsconfig.vitest.json",
		},
	},
});

export default configuration;
