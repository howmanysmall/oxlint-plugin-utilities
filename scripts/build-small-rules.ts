#!/usr/bin/env bun

import { stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { cwd, exit } from "node:process";
import { Command } from "@jsr/cliffy__command";
import { regex } from "arktype";
import { $, argv, build, file, nanoseconds, write } from "bun";
import console from "consola";
import { bold, cyan, gray, green, magenta, red, yellow } from "picocolors";
import prettyBytes from "pretty-bytes";
import prettyMilliseconds from "pretty-ms";

import type { BuildArtifact } from "bun";

const scriptPath = import.meta.path;
const scriptName = basename(scriptPath, extname(scriptPath));
const entryPoints: ReadonlyArray<string> = ["./plugins/oxc/small-rules/index.ts"];
const externalPackages: ReadonlyArray<string> = ["@oxlint/plugins", "type-fest"];
const javaScriptOutputPath = resolve("plugins/oxc/small-rules.js");
const sourceMapOutputPath = resolve("plugins/oxc/small-rules.js.map");
const pluginTypeScriptConfigurationPath = "./tsconfig.plugins.json";

interface BuildOptions {
	readonly clean: boolean;
	readonly minify: boolean;
	readonly sourceMap: boolean;
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

type BuildRelatedMessage = BuildMessage | ResolveMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isValidMessageLevel(level: unknown): level is BuildMessage["level"] {
	return level === "error" || level === "warning" || level === "info" || level === "debug" || level === "verbose";
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

function isBuildMessage(value: unknown): value is BuildMessage {
	return (
		isRecord(value) &&
		value.name === "BuildMessage" &&
		typeof value.message === "string" &&
		isValidMessageLevel(value.level) &&
		isBuildPosition(value.position)
	);
}

function isResolveMessage(value: unknown): value is ResolveMessage {
	return (
		isRecord(value) &&
		value.name === "ResolveMessage" &&
		typeof value.code === "string" &&
		typeof value.importKind === "string" &&
		typeof value.message === "string" &&
		isValidMessageLevel(value.level) &&
		isBuildPosition(value.position) &&
		typeof value.referrer === "string" &&
		typeof value.specifier === "string"
	);
}

function isBuildRelatedMessage(value: unknown): value is BuildRelatedMessage {
	return isBuildMessage(value) || isResolveMessage(value);
}

interface JavaScriptMinifyConfiguration {
	readonly identifiers: boolean;
	readonly syntax: boolean;
	readonly whitespace: boolean;
}

function getJavaScriptMinifyConfiguration(minify: boolean): boolean | JavaScriptMinifyConfiguration {
	return minify || { identifiers: false, syntax: true, whitespace: true };
}

function getJavaScriptMinifyLabel(minify: boolean): string {
	return minify ? green("full") : cyan("syntax+whitespace");
}

function formatBuildMessage(buildRelatedMessage: BuildRelatedMessage): string {
	const parts = new Array<string>();
	let size = 0;

	if (buildRelatedMessage.position) {
		const { column, length, line, lineText } = buildRelatedMessage.position;
		const relativePath = buildRelatedMessage.position.file.replace(`${cwd()}/`, "");

		parts[size++] = `${cyan(relativePath)}:${yellow(String(line))}:${yellow(String(column))}`;
		parts[size++] = `${gray(String(line))} | ${lineText}`;

		const padding = " ".repeat(String(line).length + 3 + column - 1);
		const underline = "^".repeat(Math.max(1, length));
		parts[size++] = `${padding}${red(underline)}`;
	}

	parts[size] = `${red("error:")} ${buildRelatedMessage.message}`;
	return parts.join("\n");
}

async function removeAsync(filePath: string, verbose: boolean): Promise<void> {
	const bunFile = file(filePath);
	if (await bunFile.exists()) {
		if (verbose) console.info(`Removing ${cyan(filePath)}...`);
		await bunFile.delete();
	}
}

async function cleanOutputFilesAsync(verbose: boolean): Promise<void> {
	await Promise.all([removeAsync(javaScriptOutputPath, verbose), removeAsync(sourceMapOutputPath, verbose)]);
}

function getUnexpectedArtifactPaths(
	outputs: ReadonlyArray<BuildArtifact>,
	sourceMapEnabled: boolean,
): ReadonlyArray<string> {
	const unexpectedArtifactPaths = new Array<string>();
	let size = 0;

	for (const output of outputs) {
		if (output.kind === "entry-point") continue;
		if (sourceMapEnabled && output.kind === "sourcemap") continue;
		unexpectedArtifactPaths[size++] = output.path;
	}

	return unexpectedArtifactPaths;
}

async function writeBuildOutputsAsync(
	outputs: ReadonlyArray<BuildArtifact>,
	sourceMapEnabled: boolean,
): Promise<ReadonlyArray<OutputFile>> {
	const entryPointOutputs = outputs.filter((output) => output.kind === "entry-point");
	const sourceMapOutputs = outputs.filter((output) => output.kind === "sourcemap");

	if (entryPointOutputs.length !== 1) {
		const error = new Error(`Expected exactly one entry-point artifact, received ${entryPointOutputs.length}.`);
		Error.captureStackTrace(error, writeBuildOutputsAsync);
		throw error;
	}

	if (sourceMapEnabled && sourceMapOutputs.length !== 1) {
		const error = new Error(`Expected exactly one sourcemap artifact, received ${sourceMapOutputs.length}.`);
		Error.captureStackTrace(error, writeBuildOutputsAsync);
		throw error;
	}

	if (!sourceMapEnabled && sourceMapOutputs.length > 0) {
		const error = new Error("Bun produced a sourcemap artifact even though sourcemaps were disabled.");
		Error.captureStackTrace(error, writeBuildOutputsAsync);
		throw error;
	}

	const unexpectedArtifactPaths = getUnexpectedArtifactPaths(outputs, sourceMapEnabled);
	if (unexpectedArtifactPaths.length > 0) {
		const error = new Error(`Unexpected build artifacts: ${unexpectedArtifactPaths.join(", ")}`);
		Error.captureStackTrace(error, writeBuildOutputsAsync);
		throw error;
	}

	const [entryPoint] = entryPointOutputs;
	if (entryPoint === undefined) {
		const error = new Error("Entry point artifact is undefined");
		Error.captureStackTrace(error, writeBuildOutputsAsync);
		throw error;
	}

	await write(javaScriptOutputPath, entryPoint, { createPath: true });

	const javaScriptStatistics = await stat(javaScriptOutputPath);
	const files = [
		{
			path: javaScriptOutputPath.replace(`${cwd()}/`, ""),
			size: javaScriptStatistics.size,
		},
	];

	if (sourceMapEnabled) {
		const [sourceMapOutput] = sourceMapOutputs;
		if (sourceMapOutput === undefined) {
			const error = new Error("Source map artifact is undefined");
			Error.captureStackTrace(error, writeBuildOutputsAsync);
			throw error;
		}

		await write(sourceMapOutputPath, sourceMapOutput, { createPath: true });
		const sourceMapStatistics = await stat(sourceMapOutputPath);
		files[1] = {
			path: sourceMapOutputPath.replace(`${cwd()}/`, ""),
			size: sourceMapStatistics.size,
		};
	}

	return files.toSorted((left, right) => left.path.localeCompare(right.path));
}

async function runBuildAsync(options: BuildOptions): Promise<BuildResult> {
	const startTime = nanoseconds();

	try {
		if (options.clean) {
			if (options.verbose) console.start("Cleaning output files...");
			await cleanOutputFilesAsync(options.verbose);
			if (options.verbose) console.success("Cleaned output files");
		}

		if (options.verbose) {
			console.start("Building with ..");
			console.info(`  Entry points: ${cyan(entryPoints.join(", "))}`);
			console.info(`  Minify: ${getJavaScriptMinifyLabel(options.minify)}`);
			console.info(`  Sourcemap: ${options.sourceMap ? green("yes") : gray("no")}`);
			console.info(`  TypeScript config: ${cyan(pluginTypeScriptConfigurationPath)}`);
			console.info(`  Output file: ${cyan(javaScriptOutputPath)}`);
		}

		const buildResult = await build({
			entrypoints: [...entryPoints],
			external: [...externalPackages],
			format: "esm",
			minify: getJavaScriptMinifyConfiguration(options.minify),
			packages: "external",
			plugins: [],
			sourcemap: options.sourceMap ? "external" : "none",
			target: "node",
			throw: false,
			tsconfig: pluginTypeScriptConfigurationPath,
		});

		if (!buildResult.success) {
			for (const log of buildResult.logs) console.error(formatBuildMessage(log));
			return {
				duration: (nanoseconds() - startTime) / 1_000_000,
				files: [],
				success: false,
			};
		}

		const files = await writeBuildOutputsAsync(buildResult.outputs, options.sourceMap);
		const duration = (nanoseconds() - startTime) / 1_000_000;

		return { duration, files, success: true };
	} catch (error) {
		if (error instanceof AggregateError) {
			for (const aggregateError of error.errors) {
				if (isBuildRelatedMessage(aggregateError)) console.error(formatBuildMessage(aggregateError));
				else console.error(`${red("error:")} ${String(aggregateError)}`);
			}
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

function printBuildSummary(buildResult: BuildResult, verbose: boolean): void {
	if (!buildResult.success) {
		console.fail(red(`Build failed in ${prettyMilliseconds(buildResult.duration)}`));
		return;
	}

	const javaScriptFiles = buildResult.files.filter(({ path }) => path.endsWith(".js"));
	const sourceMapFiles = buildResult.files.filter(({ path }) => path.endsWith(".js.map"));
	const totalSize = buildResult.files.reduce((sum, { size }) => sum + size, 0);

	console.log("");
	console.success(green(bold("Build completed successfully!")));
	console.log("");

	if (verbose) {
		console.info(bold("Output files:"));
		for (const { path, size } of buildResult.files) {
			const color = path.endsWith(".js.map") ? gray : cyan;
			const bytes = gray(`(${prettyBytes(size)})`);
			console.log(`  ${color(path)} ${bytes}`);
		}
		console.log("");
	}

	console.info(bold("Summary:"));
	// oxlint-disable-next-line no-script-url -- what?
	console.log(`  ${cyan("JavaScript:")} ${javaScriptFiles.length} files`);
	if (sourceMapFiles.length > 0) console.log(`  ${gray("Sourcemaps:")} ${sourceMapFiles.length} files`);
	console.log(`  ${magenta("Total size:")} ${prettyBytes(totalSize)}`);
	console.log(`  ${green("Duration:")} ${prettyMilliseconds(buildResult.duration)}`);
}

const MATCH_LINE = regex(
	// oxlint-disable-next-line unicorn/prefer-string-raw
	"^(?<filePath>.+?)\\((?<lineNumberString>\\d+),(?<columnNumberString>\\d+)\\): (?<level>error|warning) (?<code>TS\\d+): (?<message>.+)$",
);
const CARRIAGE_RETURN = /\r$/;

async function validateTypesAsync(verbose: boolean): Promise<void> {
	if (verbose) console.start("Validating types...");
	const startTime = nanoseconds();

	const shellOutput = await $`bun x --bun tsgo --project ./tsconfig.plugins.json --noEmit`.quiet().nothrow();
	const duration = (nanoseconds() - startTime) / 1_000_000;

	if (shellOutput.exitCode === 0) {
		if (verbose) console.success(`Types validated in ${prettyMilliseconds(duration)}`);
		return;
	}

	console.fail(red(`Type validation failed in ${prettyMilliseconds(duration)}`));
	console.log("");

	const stdout = shellOutput.stdout.toString().trim();
	if (stdout) {
		const lines = stdout.split("\n");
		const fileCache = new Map<string, ReadonlyArray<string>>();

		// oxlint-disable-next-line no-inner-declarations
		async function getSourceLinesAsync(filePath: string): Promise<ReadonlyArray<string> | undefined> {
			const cached = fileCache.get(filePath);
			if (cached) return cached;

			const bunFile = file(filePath);
			const exists = await bunFile.exists();
			if (!exists) return undefined;

			const fileContent = await bunFile.text();
			const sourceLines = fileContent.split("\n");
			fileCache.set(filePath, sourceLines);
			return sourceLines;
		}

		for (const line of lines) {
			const match = MATCH_LINE.exec(line);
			if (match) {
				const { filePath, lineNumberString, columnNumberString, level, code, message } = match.groups;

				const relativePath = filePath.replace(`${cwd()}/`, "");
				const lineNumber = Number.parseInt(lineNumberString, 10);
				const columnNumber = Number.parseInt(columnNumberString, 10);

				console.log(`${cyan(relativePath)}:${yellow(lineNumberString)}:${yellow(columnNumberString)}`);

				try {
					// oxlint-disable-next-line no-await-in-loop
					const sourceLines = await getSourceLinesAsync(filePath);
					// oxlint-disable-next-line max-depth
					if (!sourceLines) continue;

					const sourceLine = sourceLines[lineNumber - 1]?.replace(CARRIAGE_RETURN, "");
					// oxlint-disable-next-line max-depth
					if (sourceLine === undefined) continue;

					const displayLine = sourceLine.replaceAll("	", "    ");
					const tabCount = (sourceLine.slice(0, columnNumber - 1).match(/\t/g) ?? []).length;
					const displayCol = columnNumber - 1 + tabCount * 3;

					console.log(`${gray(lineNumberString)} | ${displayLine}`);
					const padding = " ".repeat(lineNumberString.length + 3 + displayCol);
					console.log(`${padding}${red("^")}`);
				} catch {
					// Ignore read errors
				}

				const levelText = level === "error" ? red("error:") : yellow("warning:");
				console.log(`${levelText} ${message} ${gray(`(${code})`)}\n`);
			} else if (line.trim() !== "") console.log(gray(line));
		}
	}

	const stderr = shellOutput.stderr.toString().trim();
	if (stderr) console.error(`\n${red(stderr)}`);

	exit(1);
}

const command = new Command()
	.name(scriptName)
	.version("1.0.0")
	.description("Build the Oxlint plugin for distribution.")
	.option("--no-clean", "Skip cleaning existing outputs before build", { default: true })
	.option("-v, --verbose", "Show detailed build output", { default: false })
	.option("-m, --minify", "Aggressively minify identifiers and syntax", { default: false })
	.option("--sourcemap", "Generate a sourcemap next to the built plugin", { default: false })
	.action(async ({ clean, minify, sourcemap, verbose }) => {
		if (verbose) {
			console.info(bold("Build configuration:"));
			console.log(`  Clean: ${clean ? green("yes") : gray("no")}`);
			console.log(`  Minify: ${getJavaScriptMinifyLabel(minify)}`);
			console.log(`  Sourcemap: ${sourcemap ? green("yes") : gray("no")}`);
			console.log("");
		}

		await validateTypesAsync(verbose);

		const buildResult = await runBuildAsync({
			clean,
			minify,
			sourceMap: sourcemap,
			verbose,
		});
		printBuildSummary(buildResult, verbose);

		if (!buildResult.success) exit(1);
	});

await command.parse(argv.slice(2));
