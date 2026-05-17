import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const configuration = defineConfig({
	resolve: {
		alias: [
			{ find: "#src", replacement: resolve("src/index.ts") },
			{ find: /^#src\/(.+)$/u, replacement: `${resolve("src")}/$1` },
		],
	},
	test: {
		benchmark: {
			include: ["tests/**/*.bench.ts"],
		},
		coverage: {
			enabled: true,
			exclude: ["dist", "node_modules", "scripts", "tests", "**/*.d.ts"],
			include: ["src/**"],
			reporter: ["html", "text", "text-summary"],
			thresholds: { 100: true },
		},
		environment: "node",
		globals: true,
		include: ["tests/**/*.test.ts"],
		pool: "threads",
		testTimeout: 1000,
		typecheck: {
			checker: "tsgo",
			enabled: true,
			include: ["tests/**/*.test-d.ts"],
			tsconfig: "./tsconfig.vitest.json",
		},
	},
});

export default configuration;
