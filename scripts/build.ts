#!/usr/bin/env jiti

import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { argv, exit } from "node:process";
import { Command } from "@cliffy/command";
import { type } from "arktype";
import { consola } from "consola";
import prettyBytes from "pretty-bytes";
import prettyMilliseconds from "pretty-ms";
import { build } from "tsdown";
import { bold, cyan, gray, green, magenta, red, yellow } from "yoctocolors";
import { $ } from "zx";

import { createBuildMetadataPlugin } from "./plugins/build/build-metadata";
import { createPreserveCommentsPlugin } from "./plugins/build/preserve-comments";

const scriptPath = import.meta.filename;
const scriptName = basename(scriptPath, extname(scriptPath));
const distributionDirectory = "dist";
const distributionDirectoryPath = resolve(distributionDirectory);
const typeScriptConfigurationPath = "./tsconfig.json";
const packageJsonPath = resolve("package.json");
const requiredOutputFiles: ReadonlyArray<string> = ["dist/index.js", "dist/index.d.ts"];
const forbiddenPackedPathPrefixes: ReadonlyArray<string> = ["src/", "scripts/", "tests/"];
const npmMetadataFiles = new Set(["package.json", "README.md", "LICENSE"]);

interface BuildOptions {
	readonly clean: boolean;
	readonly minify: boolean;
	readonly packageChecks: boolean;
	readonly sourcemap: boolean;
	readonly verbose: boolean;
}

const isPackageJson = type({
	"+": "ignore",
	"dependencies?": type("Record<string, string>").readonly().or("undefined | null"),
	"devDependencies?": type("Record<string, string>").readonly().or("undefined | null"),
	"exports?": "unknown | undefined | null",
	"files?": type("string[]").readonly().or("undefined | null"),
	"main?": "string | undefined | null",
	"module?": "string | undefined | null",
	"name?": "string | undefined | null",
	"optionalDependencies?": type("Record<string, string>").readonly().or("undefined | null"),
	"peerDependencies?": type("Record<string, string>").readonly().or("undefined | null"),
	"types?": "string | undefined | null",
	"version?": "string | undefined | null",
}).readonly();
type PackageJson = typeof isPackageJson.infer;

interface OutputFile {
	readonly path: string;
	readonly size: number;
}

const isAubePackJsonFileEntry = type({ path: "string" }).readonly();
const isAubePackJsonEntry = type({
	"+": "ignore",
	filename: "string",
	files: isAubePackJsonFileEntry.array().readonly(),
	name: "string",
	version: "string.semver",
}).readonly();

const isAubePackJsonOutput = isAubePackJsonEntry.array().atLeastLength(1).readonly();
type AubePackJsonOutput = typeof isAubePackJsonOutput.infer;

interface BuildResult {
	readonly duration: number;
	readonly files: ReadonlyArray<OutputFile>;
	readonly success: boolean;
}

function getBooleanString(boolean: boolean): string {
	return boolean ? green("yes") : gray("no");
}

const NORMALIZE_REGEXP = /^\.\//u;
function normalizePublishedPath(path: string): string {
	return path.replace(NORMALIZE_REGEXP, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readPackageJsonAsync(): Promise<PackageJson> {
	const result = isPackageJson(JSON.parse(await readFile(packageJsonPath, "utf8")));
	if (result instanceof type.errors) {
		const error = new TypeError(`package.json has invalid shape: ${result.summary}`);
		Error.captureStackTrace(error, readPackageJsonAsync);
		throw error;
	}
	return result;
}

function getProductionDependencyNames(packageJson: PackageJson): ReadonlyArray<string> {
	return [
		...Object.keys(packageJson.dependencies ?? {}),
		...Object.keys(packageJson.peerDependencies ?? {}),
		...Object.keys(packageJson.optionalDependencies ?? {}),
	].toSorted((left, right) => left.localeCompare(right));
}

async function removeAsync(filePath: string, verbose: boolean): Promise<void> {
	try {
		await stat(filePath);
	} catch {
		return;
	}

	if (verbose) consola.info(`Removing ${cyan(filePath)}...`);
	await rm(filePath, { recursive: true });
}

async function cleanOutputDirectoryAsync(verbose: boolean): Promise<void> {
	await removeAsync(distributionDirectoryPath, verbose);
}

async function getOutputFilesAsync(directory: string): Promise<ReadonlyArray<OutputFile>> {
	const resolvedDirectory = resolve(directory);

	async function walk(walkDirectory: string): Promise<ReadonlyArray<OutputFile>> {
		const entries = await readdir(walkDirectory, { withFileTypes: true });
		const results = await Promise.all(
			entries.map(async (entry): Promise<ReadonlyArray<OutputFile>> => {
				const fullPath = resolve(walkDirectory, entry.name);
				if (entry.isDirectory()) return walk(fullPath);
				if (!entry.isFile()) return [];

				const fileStatistics = await stat(fullPath);
				return [
					{
						path: fullPath.replace(`${resolvedDirectory}/`, `${directory}/`),
						size: fileStatistics.size,
					},
				];
			}),
		);

		return results.flat();
	}

	const files = await walk(directory);
	return files.toSorted((left, right) => left.path.localeCompare(right.path));
}

async function assertFileExistsAsync(path: string): Promise<void> {
	try {
		const fileStatistics = await stat(path);
		if (fileStatistics.isFile()) return;
	} catch {
		// The shared message below is clearer than the filesystem error.
	}

	const error = new Error(`Required package file is missing: ${path}`);
	Error.captureStackTrace(error, assertFileExistsAsync);
	throw error;
}

async function validateReferencedPackageFilesAsync(packageJson: PackageJson, verbose: boolean): Promise<void> {
	if (verbose) consola.start("Validating package metadata...");

	const referencedFiles = new Set<string>();
	if (typeof packageJson.main === "string" && packageJson.main.length > 0) referencedFiles.add(packageJson.main);
	if (typeof packageJson.types === "string" && packageJson.types.length > 0) referencedFiles.add(packageJson.types);

	const rootExport = isRecord(packageJson.exports) ? packageJson.exports["."] : undefined;
	if (typeof rootExport === "string") referencedFiles.add(rootExport);
	else if (isRecord(rootExport)) {
		for (const value of Object.values(rootExport)) {
			if (typeof value === "string") referencedFiles.add(value);
		}
	}

	await Promise.all(
		[...referencedFiles].map(async (filePath) => assertFileExistsAsync(normalizePublishedPath(filePath))),
	);

	if (verbose) consola.success("Package metadata references existing files");
}

function getPackTarballPath(packDirectory: string, packEntries: AubePackJsonOutput): string {
	const [packEntry] = packEntries;
	if (!packEntry || typeof packEntry.filename !== "string") {
		const error = new Error("aube pack did not report a generated tarball");
		Error.captureStackTrace(error, getPackTarballPath);
		throw error;
	}

	return resolve(packDirectory, packEntry.filename);
}

function getPackedFilePaths(packEntries: AubePackJsonOutput): ReadonlyArray<string> {
	const [packEntry] = packEntries;
	if (!packEntry) {
		const error = new Error("aube pack did not report any entries");
		Error.captureStackTrace(error, getPackedFilePaths);
		throw error;
	}

	const result = isAubePackJsonEntry(packEntry);
	if (result instanceof type.errors) {
		const error = new TypeError(`Invalid pack entry format: ${result.summary}`);
		Error.captureStackTrace(error, getPackedFilePaths);
		throw error;
	}

	return result.files.map(({ path }) => normalizePublishedPath(path));
}

function validatePackedFiles(packedFiles: ReadonlyArray<string>): void {
	for (const requiredOutputFile of requiredOutputFiles) {
		if (!packedFiles.includes(requiredOutputFile)) {
			const error = new Error(`Packed tarball is missing ${requiredOutputFile}`);
			Error.captureStackTrace(error, validatePackedFiles);
			throw error;
		}
	}

	for (const packedFile of packedFiles) {
		if (forbiddenPackedPathPrefixes.some((prefix) => packedFile.startsWith(prefix))) {
			const error = new Error(`Packed tarball includes unpublished source path: ${packedFile}`);
			Error.captureStackTrace(error, validatePackedFiles);
			throw error;
		}

		if (!packedFile.startsWith(`${distributionDirectory}/`) && !npmMetadataFiles.has(packedFile)) {
			const error = new Error(`Packed tarball includes unexpected file: ${packedFile}`);
			Error.captureStackTrace(error, validatePackedFiles);
			throw error;
		}
	}
}

async function runPublicationChecksAsync(verbose: boolean): Promise<void> {
	if (verbose) consola.start("Packing package smoke tarball...");
	const packDirectory = await mkdtemp(resolve(tmpdir(), "oxlint-plugin-utilities-pack-"));

	try {
		const packOutput = isAubePackJsonOutput(
			await $`aube pack --json --ignore-scripts --pack-destination ${packDirectory}`.quiet().json(),
		);
		if (packOutput instanceof type.errors) {
			const error = new TypeError(`aube pack reported an unexpected JSON shape: ${packOutput.summary}`);
			Error.captureStackTrace(error, runPublicationChecksAsync);
			throw error;
		}

		const packedFiles = getPackedFilePaths(packOutput);
		validatePackedFiles(packedFiles);
		const tarballPath = getPackTarballPath(packDirectory, packOutput);

		if (verbose) {
			consola.success(`Packed ${cyan(tarballPath)}`);
			consola.start("Running publint...");
		}
		await $`aube run publint run ${tarballPath}`.quiet();

		if (verbose) consola.start("Running arethetypeswrong...");
		await $`aube run attw ${tarballPath} --profile esm-only`.quiet();

		if (verbose) consola.success("Package checks passed");
	} finally {
		await rm(packDirectory, { force: true, recursive: true });
	}
}

async function validateTypesAsync(verbose: boolean): Promise<void> {
	if (verbose) consola.start("Validating types...");
	const startTime = performance.now();
	const typeCheck = await $`aube run type-check --project ${typeScriptConfigurationPath}`.quiet().nothrow();
	const duration = performance.now() - startTime;

	if (typeCheck.exitCode === 0) {
		if (verbose) consola.success(`Types validated in ${prettyMilliseconds(duration)}`);
		return;
	}

	const stdout = typeCheck.stdout.trim();
	const stderr = typeCheck.stderr.trim();
	consola.fail(red(`Type validation failed in ${prettyMilliseconds(duration)}`));
	if (stdout) consola.log(stdout);
	if (stderr) consola.error(stderr);

	const error = new Error("Type validation failed");
	Error.captureStackTrace(error, validateTypesAsync);
	throw error;
}

async function runBuildAsync(buildOptions: BuildOptions): Promise<BuildResult> {
	const startTime = performance.now();

	try {
		if (buildOptions.clean) {
			if (buildOptions.verbose) consola.start("Cleaning dist directory...");
			await cleanOutputDirectoryAsync(buildOptions.verbose);
			if (buildOptions.verbose) consola.success("Cleaned dist directory");
		}

		const packageJson = await readPackageJsonAsync();
		const neverBundle = getProductionDependencyNames(packageJson);
		const version = packageJson.version ?? "0.0.0";

		if (buildOptions.verbose) {
			consola.start("Building with tsdown...");
			consola.info(`  Entry point: ${cyan("./src/index.ts")}`);
			consola.info(`  Minify: ${getBooleanString(buildOptions.minify)}`);
			consola.info(`  Sourcemap: ${getBooleanString(buildOptions.sourcemap)}`);
			consola.info(`  Declarations: ${getBooleanString(true)}`);
			consola.info(`  Output directory: ${cyan(distributionDirectory)}`);
			if (neverBundle.length > 0) consola.info(`  Never bundle: ${cyan(neverBundle.join(", "))}`);
		}

		await build({
			clean: false,
			deps: { neverBundle: [...neverBundle] },
			dts: {
				compilerOptions: {
					declarationMap: buildOptions.sourcemap,
				},
				sourcemap: buildOptions.sourcemap,
			},
			entry: { index: "./src/index.ts" },
			fixedExtension: false,
			format: ["esm"],
			logLevel: buildOptions.verbose ? "info" : "silent",
			minify: buildOptions.minify,
			outDir: distributionDirectory,
			outputOptions: {
				comments: {
					annotation: true,
					jsdoc: true,
					legal: true,
				},
			},
			platform: "node",
			plugins: [createBuildMetadataPlugin({ version }), createPreserveCommentsPlugin({ enabled: true })],
			sourcemap: buildOptions.sourcemap,
			tsconfig: typeScriptConfigurationPath,
		});

		await Promise.all(requiredOutputFiles.map(async (filePath) => assertFileExistsAsync(filePath)));

		await validateReferencedPackageFilesAsync(packageJson, buildOptions.verbose);

		if (buildOptions.packageChecks) await runPublicationChecksAsync(buildOptions.verbose);

		const files = await getOutputFilesAsync(distributionDirectory);
		return {
			duration: performance.now() - startTime,
			files,
			success: true,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		consola.error(`${red("error:")} ${message}`);

		return {
			duration: performance.now() - startTime,
			files: [],
			success: false,
		};
	}
}

function printBuildSummary(buildResult: BuildResult, verbose: boolean): void {
	if (!buildResult.success) {
		consola.fail(red(`Build failed in ${prettyMilliseconds(buildResult.duration)}`));
		return;
	}

	const { files } = buildResult;
	let javaScriptFiles = 0;
	let declarationFiles = 0;
	let sourceMapFiles = 0;
	let totalSize = 0;

	for (const { path, size } of files) {
		totalSize += size;
		if (path.endsWith(".js")) javaScriptFiles += 1;
		else if (path.endsWith(".d.ts")) declarationFiles += 1;
		else if (path.endsWith(".js.map")) sourceMapFiles += 1;
	}

	consola.log("");
	consola.success(green(bold("Build completed successfully!")));
	consola.log("");

	if (verbose) {
		consola.info(bold("Output files:"));
		for (const { path, size } of files) {
			const color = path.endsWith(".js.map") ? gray : path.endsWith(".d.ts") ? yellow : cyan;
			consola.log(`  ${color(path)} ${gray(`(${prettyBytes(size)})`)}`);
		}
		consola.log("");
	}

	consola.info(bold("Summary:"));
	consola.log(`  ${cyan("JS:")} ${javaScriptFiles} files`);
	consola.log(`  ${yellow("Declarations:")} ${declarationFiles} files`);
	if (sourceMapFiles > 0) consola.log(`  ${gray("Sourcemaps:")} ${sourceMapFiles} files`);
	consola.log(`  ${magenta("Total size:")} ${prettyBytes(totalSize)}`);
	consola.log(`  ${green("Duration:")} ${prettyMilliseconds(buildResult.duration)}`);
}

const command = new Command()
	.name(scriptName)
	.version("2.0.0")
	.description("Build the Node package for distribution.")
	.option("--no-clean", "Skip cleaning dist/ before build", { default: true })
	.option("-v, --verbose", "Show detailed build output", { default: false })
	.option("-m, --minify", "Aggressively minify identifiers and syntax", { default: false })
	.option("--package-checks", "Run aube pack, publint, and attw after building", { default: false })
	.option("--sourcemap", "Generate sourcemaps", { default: false })
	.action(async ({ clean, minify, packageChecks, sourcemap, verbose }) => {
		if (verbose) {
			consola.info(bold("Build configuration:"));
			consola.log(`  Clean: ${getBooleanString(clean)}`);
			consola.log(`  Minify: ${getBooleanString(minify)}`);
			consola.log(`  Package checks: ${getBooleanString(packageChecks)}`);
			consola.log(`  Sourcemap: ${getBooleanString(sourcemap)}`);
			consola.log("");
		}

		await validateTypesAsync(verbose);

		const buildResult = await runBuildAsync({ clean, minify, packageChecks, sourcemap, verbose });
		printBuildSummary(buildResult, verbose);

		if (!buildResult.success) exit(1);
	});

const scriptIndex = argv.findIndex((argument) => resolve(argument) === import.meta.filename);
await command.parse(argv.slice(scriptIndex + 1));
