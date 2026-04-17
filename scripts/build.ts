#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, resolve } from "node:path";
import { arch, cwd, exit, platform } from "node:process";
import { Command } from "@jsr/cliffy__command";
import { $, argv, build, file, fileURLToPath, Glob, nanoseconds, write } from "bun";
import console from "consola";
import { bold, cyan, gray, green, magenta, red, yellow } from "picocolors";
import prettyBytes from "pretty-bytes";
import prettyMilliseconds from "pretty-ms";

import {
	getStaleDeclarationSupportPaths,
	normalizeDeclarationSupportPaths,
} from "./utilities/declaration-support-cache";

const scriptPath = import.meta.path;
const SCRIPT_NAME = basename(scriptPath, extname(scriptPath));
const CRITICAL_FILES = ["dist/index.js", "dist/index.d.ts"];
const DECLARATION_CACHE_KEY = createHash("sha1").update(cwd()).digest("hex").slice(0, 12);
const DECLARATION_CACHE_DIRECTORY = resolve(tmpdir(), `${SCRIPT_NAME}-${DECLARATION_CACHE_KEY}`);
const DECLARATION_CACHE_MANIFEST_PATH = resolve(DECLARATION_CACHE_DIRECTORY, "support-manifest.json");
const DECLARATION_CACHE_OUTPUT_DIRECTORY = resolve(DECLARATION_CACHE_DIRECTORY, "out");
const DECLARATION_CACHE_BUILD_INFO_PATH = resolve(DECLARATION_CACHE_DIRECTORY, "tsgo.tsbuildinfo");
type BuildRelatedMessage = BuildMessage | ResolveMessage;

interface ShellError {
	readonly exitCode: number;
	readonly message: string;
	readonly stderr: Uint8Array;
	readonly stdout: Uint8Array;
}

function isBuildMessage(object: unknown): object is BuildMessage {
	return (
		isRecord(object) &&
		object.name === "BuildMessage" &&
		typeof object.message === "string" &&
		isValidMessageLevel(object.level) &&
		isBuildPosition(object.position)
	);
}
function isResolveMessage(object: unknown): object is ResolveMessage {
	return (
		isRecord(object) &&
		object.name === "ResolveMessage" &&
		typeof object.code === "string" &&
		typeof object.importKind === "string" &&
		typeof object.message === "string" &&
		isValidMessageLevel(object.level) &&
		isBuildPosition(object.position) &&
		typeof object.referrer === "string" &&
		typeof object.specifier === "string"
	);
}
function isBuildRelatedMessage(object: unknown): object is BuildRelatedMessage {
	return isBuildMessage(object) || isResolveMessage(object);
}
function isShellError(object: unknown): object is ShellError {
	return (
		isRecord(object) &&
		typeof object.exitCode === "number" &&
		Number.isInteger(object.exitCode) &&
		typeof object.message === "string" &&
		object.stderr instanceof Uint8Array &&
		object.stdout instanceof Uint8Array
	);
}

function isBuildPosition(position: unknown): position is BuildMessage["position"] {
	return (
		position === null ||
		(isRecord(position) &&
			typeof position.column === "number" &&
			typeof position.file === "string" &&
			typeof position.length === "number" &&
			typeof position.line === "number" &&
			typeof position.lineText === "string" &&
			typeof position.namespace === "string")
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidMessageLevel(level: unknown): level is BuildMessage["level"] {
	return level === "error" || level === "warning" || level === "info" || level === "debug" || level === "verbose";
}

const DIST_DIRECTORY = resolve(".", "dist");
const ENTRY_POINTS = ["./src/index.ts"];
const SOURCE_DIRECTORY = resolve(".", "src");
const EXTERNAL_PACKAGES = [
	"@typescript-eslint/utils",
	"@typescript-eslint/parser",
	"@typescript-eslint/types",
	"eslint",
	"typescript",
	"oxfmt",
	"oxc-resolver",
	"oxc-parser",
];

interface BuildOptions {
	readonly clean: boolean;
	readonly minify: boolean;
	readonly silent: boolean;
	readonly sourcemap: boolean;
	readonly verbose: boolean;
}

interface OutputFile {
	readonly path: string;
	readonly size: number;
}
interface BuildResult {
	readonly duration: number;
	readonly files: ReadonlyArray<OutputFile>;
	readonly success: boolean;
}

function getJavaScriptMinifyConfiguration(minify: boolean):
	| boolean
	| {
			readonly identifiers: boolean;
			readonly syntax: boolean;
			readonly whitespace: boolean;
	  } {
	if (minify) return { identifiers: true, syntax: true, whitespace: true };

	return {
		identifiers: false,
		syntax: true,
		whitespace: true,
	};
}

function getJavaScriptMinifyLabel(minify: boolean): string {
	return minify ? green("full") : cyan("syntax+whitespace");
}

function formatBuildMessage({ position, message }: BuildRelatedMessage): string {
	const parts = new Array<string>();
	let size = 0;

	if (position) {
		const { line, column, lineText, length } = position;
		const relativePath = position.file.replace(`${cwd()}/`, "");

		parts[size++] = `${cyan(relativePath)}:${yellow(String(line))}:${yellow(String(column))}`;
		parts[size++] = `${gray(String(line))} | ${lineText}`;

		const padding = " ".repeat(String(line).length + 3 + column - 1);
		const underline = "^".repeat(Math.max(1, length));
		parts[size++] = `${padding}${red(underline)}`;
	}

	parts[size] = `${red("error:")} ${message}`;
	return parts.join("\n");
}

function getTsgoExecutablePath(): string {
	const platformPackageName = `@typescript/native-preview-${platform}-${arch}`;
	const packageJsonUrl = import.meta.resolve(`${platformPackageName}/package.json`);
	const packageJsonPath = fileURLToPath(packageJsonUrl);
	const executablePath = resolve(dirname(packageJsonPath), "lib", platform === "win32" ? "tsgo.exe" : "tsgo");

	if (!existsSync(executablePath)) {
		const error = new Error(`TypeScript Native executable not found: ${executablePath}`);
		Error.captureStackTrace(error, getTsgoExecutablePath);
		throw error;
	}

	return executablePath;
}

async function cleanOutputDirectoryAsync(verbose: boolean): Promise<void> {
	if (existsSync(DIST_DIRECTORY)) {
		if (verbose) console.info(`Removing ${cyan(DIST_DIRECTORY)}...`);
		await rm(DIST_DIRECTORY, { recursive: true });
	}
}

function createDeclarationEmitFlags(outputDirectory: string, buildInfoPath: string): Array<string> {
	return [
		"--allowJs",
		"false",
		"--declaration",
		"--emitDeclarationOnly",
		"--exactOptionalPropertyTypes",
		"--forceConsistentCasingInFileNames",
		"--isolatedModules",
		"--lib",
		"ES2023",
		"--module",
		"ES2022",
		"--moduleDetection",
		"force",
		"--moduleResolution",
		"Bundler",
		"--incremental",
		"--noFallthroughCasesInSwitch",
		"--noImplicitAny",
		"--noImplicitOverride",
		"--noImplicitReturns",
		"--noImplicitThis",
		"--noUncheckedIndexedAccess",
		"--noUncheckedSideEffectImports",
		"--noUnusedLocals",
		"--noUnusedParameters",
		"--outDir",
		outputDirectory,
		"--resolveJsonModule",
		"false",
		"--rootDir",
		"src",
		"--skipLibCheck",
		"--strict",
		"--target",
		"es2023",
		"--tsBuildInfoFile",
		buildInfoPath,
		"--types",
		"bun,node",
		"--useUnknownInCatchVariables",
		"--verbatimModuleSyntax",
		"--declarationMap",
		"false",
		"--sourceMap",
		"false",
	];
}

const DECLARATION_GLOB = new Glob("**/*.d.ts");
function getSourceDeclarationRelativePaths(sourceDirectory: string): ReadonlyArray<string> {
	return normalizeDeclarationSupportPaths([...DECLARATION_GLOB.scanSync({ cwd: sourceDirectory, onlyFiles: true })]);
}

async function readDeclarationSupportManifestAsync(manifestPath: string): Promise<ReadonlyArray<string>> {
	const manifestFile = file(manifestPath);
	const exists = await manifestFile.exists();
	if (!exists) return [];

	try {
		const manifest: unknown = await manifestFile.json();
		if (!Array.isArray(manifest) || !manifest.every((entry) => typeof entry === "string")) return [];
		return normalizeDeclarationSupportPaths(manifest);
	} catch {
		return [];
	}
}

async function syncSourceDeclarationFilesAsync(
	sourceDirectory: string,
	targetDirectory: string,
	manifestPath: string,
): Promise<void> {
	const relativePaths = getSourceDeclarationRelativePaths(sourceDirectory);
	const previousPaths = await readDeclarationSupportManifestAsync(manifestPath);
	const stalePaths = getStaleDeclarationSupportPaths(previousPaths, relativePaths);

	await Promise.all(
		stalePaths.map(async (relativePath): Promise<void> => {
			await rm(resolve(targetDirectory, relativePath), { force: true });
		}),
	);

	await Promise.all(
		relativePaths.map(async (relativePath): Promise<void> => {
			await write(resolve(targetDirectory, relativePath), file(resolve(sourceDirectory, relativePath)), {
				createPath: true,
			});
		}),
	);

	await write(manifestPath, JSON.stringify(relativePaths), { createPath: true });
}

async function generateBundledDeclarationsAsync(verbose: boolean): Promise<void> {
	const tsgoExecutablePath = getTsgoExecutablePath();
	const declarationBundlerPromise = import("./utilities/declaration-bundler");

	await mkdir(DECLARATION_CACHE_OUTPUT_DIRECTORY, { recursive: true });

	const flags = createDeclarationEmitFlags(DECLARATION_CACHE_OUTPUT_DIRECTORY, DECLARATION_CACHE_BUILD_INFO_PATH);
	if (verbose) console.log(`Calling ${cyan("tsgo")} ${flags.join(" ")}`);

	await $`${tsgoExecutablePath} ${flags}`.quiet();
	await syncSourceDeclarationFilesAsync(
		SOURCE_DIRECTORY,
		DECLARATION_CACHE_OUTPUT_DIRECTORY,
		DECLARATION_CACHE_MANIFEST_PATH,
	);

	const { bundleDeclarationEntryPoint, createDeclarationBundlerProgram } = await declarationBundlerPromise;
	const bundledEntrypoints = [{ entryFileName: "index.d.ts", outputFileName: resolve(DIST_DIRECTORY, "index.d.ts") }];
	const program = createDeclarationBundlerProgram({
		entryFilePaths: bundledEntrypoints.map(({ entryFileName }) =>
			resolve(DECLARATION_CACHE_OUTPUT_DIRECTORY, entryFileName),
		),
	});

	await Promise.all(
		bundledEntrypoints.map(async ({ entryFileName, outputFileName }): Promise<void> => {
			const bundledDeclaration = bundleDeclarationEntryPoint({
				entryFilePath: resolve(DECLARATION_CACHE_OUTPUT_DIRECTORY, entryFileName),
				program,
			});
			await write(outputFileName, bundledDeclaration);
		}),
	);
}

async function getOutputFilesAsync(directory: string): Promise<ReadonlyArray<OutputFile>> {
	const resolvedDirectory = resolve(directory);

	async function walk(walkDirectory: string): Promise<ReadonlyArray<OutputFile>> {
		const entries = await readdir(walkDirectory, { withFileTypes: true });
		const results: ReadonlyArray<ReadonlyArray<OutputFile>> = await Promise.all(
			entries.map(async (entry): Promise<ReadonlyArray<OutputFile>> => {
				const fullPath = resolve(walkDirectory, entry.name);
				if (entry.isDirectory()) return walk(fullPath);
				if (entry.isFile()) {
					const stats = await stat(fullPath);
					return [
						{
							path: fullPath.replace(`${resolvedDirectory}/`, ""),
							size: stats.size,
						},
					];
				}
				return [];
			}),
		);
		return results.flat();
	}

	const files = await walk(directory);
	return [...files].toSorted((left, right) => left.path.localeCompare(right.path));
}

async function runBuildAsync(options: BuildOptions): Promise<BuildResult> {
	const startTime = nanoseconds();

	try {
		if (options.clean) {
			if (options.verbose) console.start("Cleaning dist directory...");
			await cleanOutputDirectoryAsync(options.verbose);
			if (options.verbose) console.success("Cleaned dist directory");
		}

		if (options.verbose) {
			console.start("Building with Bun ...");
			console.info(`  Entry points: ${cyan(ENTRY_POINTS.join(", "))}`);
			console.info(`  Minify: ${getJavaScriptMinifyLabel(options.minify)}`);
			console.info(`  Sourcemap: ${options.sourcemap ? green("yes") : gray("no")}`);
			console.info(`  Declarations: ${cyan("custom bundle")}`);
		}

		const declarationBuildPromise = generateBundledDeclarationsAsync(options.verbose);
		const { buildMetadata } = await import("./plugins/bun/build-metadata");
		const { createPreserveCommentsPlugin } = await import("./plugins/bun/preserve-comments");
		const preserveComments = createPreserveCommentsPlugin({ outputDirectory: DIST_DIRECTORY });

		const [buildResult] = await Promise.all([
			build({
				entrypoints: [...ENTRY_POINTS],
				external: [...EXTERNAL_PACKAGES],
				format: "esm",
				minify: getJavaScriptMinifyConfiguration(options.minify),
				outdir: DIST_DIRECTORY,
				packages: "external",
				plugins: [buildMetadata, preserveComments],
				sourcemap: options.sourcemap ? "external" : "none",
				target: "node",
				tsconfig: "./tsconfig.json",
			}),
			declarationBuildPromise,
		]);

		if (!buildResult.success) {
			for (const log of buildResult.logs) console.error(formatBuildMessage(log));
			return {
				duration: (nanoseconds() - startTime) / 1_000_000,
				files: [],
				success: false,
			};
		}

		if (options.verbose) console.success("Bun build completed");
		if (options.verbose) console.success("Type declarations generated");

		for (const criticalFile of CRITICAL_FILES) {
			if (!existsSync(criticalFile)) {
				console.error(`Critical file missing: ${red(criticalFile)}`);
				return {
					duration: (nanoseconds() - startTime) / 1_000_000,
					files: [],
					success: false,
				};
			}
		}

		const outputFiles = await getOutputFilesAsync(DIST_DIRECTORY);
		const duration = (nanoseconds() - startTime) / 1_000_000;

		return { duration, files: outputFiles, success: true };
	} catch (error) {
		if (error instanceof AggregateError) {
			for (const aggregateError of error.errors) {
				if (isBuildRelatedMessage(aggregateError)) console.error(formatBuildMessage(aggregateError));
				else console.error(`${red("error:")} ${String(aggregateError)}`);
			}
		} else if (isShellError(error)) {
			console.error(`${red("error:")} Command failed with exit code ${error.exitCode}`);
			const stderr = Buffer.from(error.stderr).toString().trim();
			const stdout = Buffer.from(error.stdout).toString().trim();
			if (stderr.length > 0) console.error(stderr);
			if (stdout.length > 0) console.log(stdout);
		} else {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`${red("error:")} ${message}`);
		}

		return {
			duration: (nanoseconds() - startTime) / 1_000_000,
			files: [],
			success: false,
		};
	}
}

function printBuildSummary({ files, duration, success }: BuildResult, verbose: boolean, silent: boolean): void {
	if (!success) {
		if (!silent) console.fail(red(`Build failed in ${prettyMilliseconds(duration)}`));
		return;
	}

	const jsFiles = files.filter(({ path }) => path.endsWith(".js"));
	const dtsFiles = files.filter(({ path }) => path.endsWith(".d.ts"));
	const mapFiles = files.filter(({ path }) => path.endsWith(".js.map"));
	const totalSize = files.reduce((sum, { size }) => sum + size, 0);

	if (!silent) {
		console.log("");
		console.success(green(bold("Build completed successfully!")));
		console.log("");
	}

	if (verbose) {
		console.info(bold("Output files:"));
		for (const { path, size } of files) {
			const color = path.endsWith(".js") ? cyan : path.endsWith(".d.ts") ? yellow : gray;
			console.log(`  ${color(path)} ${gray(`(${prettyBytes(size)})`)}`);
		}
		console.log("");
	}

	console.info(bold("Summary:"));
	console.log(`  ${cyan("JS:")} ${jsFiles.length} files`);
	console.log(`  ${yellow("Declarations:")} ${dtsFiles.length} files`);
	if (mapFiles.length > 0) console.log(`  ${gray("Sourcemaps:")} ${mapFiles.length} files`);
	console.log(`  ${magenta("Total size:")} ${prettyBytes(totalSize)}`);
	console.log(`  ${green("Duration:")} ${prettyMilliseconds(duration)}`);
}

try {
	await cleanOutputDirectoryAsync(false);
} catch {
	// I do not care.
}

const command = new Command()
	.name(SCRIPT_NAME)
	.version("1.0.0")
	.description("Build the ESLint plugin for distribution.")
	.option("--no-clean", "Skip cleaning dist/ before build", { default: true })
	.option("-v, --verbose", "Show detailed build output", { default: false })
	.option("-m, --minify", "Aggressively minify identifiers and syntax", { default: false })
	.option("-s, --silent", "Suppress non-error output", { default: false })
	.option("--sourcemap", "Generate sourcemaps", { default: false })
	.action(async ({ clean, minify, silent, sourcemap, verbose }) => {
		const options: BuildOptions = { clean, minify, silent, sourcemap, verbose };

		if (verbose) {
			console.info(bold("Build configuration:"));
			console.log(`  Clean: ${clean ? green("yes") : gray("no")}`);
			console.log(`  Minify: ${getJavaScriptMinifyLabel(minify)}`);
			console.log(`  Sourcemap: ${sourcemap ? green("yes") : gray("no")}`);
			console.log("");
		}

		const result = await runBuildAsync(options);
		printBuildSummary(result, verbose, silent);

		if (!result.success) exit(1);
	});

await command.parse(argv.slice(2));
