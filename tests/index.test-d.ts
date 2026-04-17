import { expectTypeOf, test } from "vitest";

import { definePlugin, defineRule } from "../src/index";

import type {
	InferContextFromRule,
	InferOptionsFromSchema,
	InferSchemaType,
	RuleSchema,
	RuleSchemaDefinition,
} from "../src/index";

interface ShorthandPrimaryOption {
	readonly count: number;
	readonly enabled?: boolean;
	readonly mode: "loose" | "strict";
}

interface RootArraySecondaryOption {
	readonly enabled?: boolean;
}

interface RefinedReferenceOption {
	readonly enabled: boolean;
	readonly mode: "loose" | "strict";
}

test("InferSchemaType covers primitive keywords and enum subtraction", () => {
	const unionSchema = {
		type: ["string", "null"],
	} as const satisfies RuleSchema;
	const excludedEnumSchema = {
		enum: ["error", "warn"] as const,
		not: {
			enum: ["warn"] as const,
		},
		type: "string",
	} as const satisfies RuleSchema;
	const anySchema = {
		type: "any",
	} as const satisfies RuleSchema;

	expectTypeOf<InferSchemaType<typeof unionSchema>>().toEqualTypeOf<string | null>();
	expectTypeOf<InferSchemaType<typeof excludedEnumSchema>>().toEqualTypeOf<"error">();
	expectTypeOf<InferSchemaType<typeof anySchema>>().toEqualTypeOf<unknown>();

	// @ts-expect-error invalid enum values must be rejected
	const invalidEnumValues: RuleSchema["enum"] = [undefined];

	void invalidEnumValues;
}, 1000);

test("InferSchemaType resolves local refs and composition", () => {
	const referencedSchema = {
		$ref: "#/definitions/refined",
		definitions: {
			base: {
				properties: {
					enabled: { type: "boolean" },
				},
				required: ["enabled"],
				type: "object",
			},
			refined: {
				allOf: [
					{ $ref: "#/definitions/base" },
					{
						properties: {
							mode: { enum: ["strict", "loose"], type: "string" },
						},
						required: ["mode"],
						type: "object",
					},
				],
				type: "object",
			},
		},
	} as const satisfies RuleSchema;
	const branchingSchema = {
		oneOf: [{ enum: ["strict", "loose"], type: "string" }, { type: "integer" }],
	} as const satisfies RuleSchema;

	expectTypeOf<InferSchemaType<typeof referencedSchema>>().toEqualTypeOf<RefinedReferenceOption>();
	expectTypeOf<InferSchemaType<typeof branchingSchema>>().toEqualTypeOf<"loose" | "strict" | number>();
}, 1000);

test("InferSchemaType handles tuples, index overlays, and dependencies", () => {
	const tupleSchema = {
		additionalItems: {
			enum: ["warn", "error"],
			type: "string",
		},
		items: [{ type: "string" }, { type: "integer" }],
		type: "array",
	} as const satisfies RuleSchema;
	const objectSchema = {
		additionalProperties: { type: "string" },
		dependencies: {
			mode: ["fallback"],
		},
		patternProperties: {
			"^flag-": { type: "boolean" },
		},
		properties: {
			fallback: { type: "integer" },
			mode: { enum: ["strict", "loose"], type: "string" },
		},
		type: "object",
	} as const satisfies RuleSchema;
	type IndexedObject = InferSchemaType<typeof objectSchema>;
	const indexedObject: IndexedObject = {
		fallback: 1,
		"flag-primary": true,
		mode: "strict",
		other: "value",
	};

	expectTypeOf<InferSchemaType<typeof tupleSchema>>().toEqualTypeOf<
		readonly [string, number, ...ReadonlyArray<"error" | "warn">]
	>();
	expectTypeOf(indexedObject.fallback).toEqualTypeOf<number | undefined>();
	expectTypeOf(indexedObject.mode).toEqualTypeOf<"loose" | "strict" | undefined>();
}, 1000);

test("defineRule infers tuple options from shorthand schemas and message ids", () => {
	const rule = defineRule({
		create(context) {
			const [primary, retries, tags] = context.options;

			void primary;
			void retries;
			void tags;

			return {};
		},
		meta: {
			defaultOptions: [{ count: 1, mode: "strict" }, 0, ["typed"]],
			messages: {
				invalidMode: "Mode is invalid.",
				missingCount: "Count is required.",
			},
			schema: [
				{
					properties: {
						count: { type: "integer" },
						enabled: { type: "boolean" },
						mode: { enum: ["strict", "loose"], type: "string" },
					},
					required: ["count", "mode"],
					type: "object",
				},
				{ type: "integer" },
				{
					items: { type: "string" },
					type: "array",
				},
			] as const,
		},
	});
	type RuleContext = InferContextFromRule<typeof rule>;
	type RuleDiagnostic = Parameters<RuleContext["report"]>[0];

	expectTypeOf<RuleContext["options"]>().toEqualTypeOf<
		readonly [ShorthandPrimaryOption, number, ReadonlyArray<string>]
	>();
	expectTypeOf<RuleDiagnostic["messageId"]>().toEqualTypeOf<"invalidMode" | "missingCount">();
	const plugin = definePlugin({
		rules: {
			typed: rule,
		},
	});
	type PluginContext = InferContextFromRule<(typeof plugin.rules)["typed"]>;

	expectTypeOf<PluginContext["options"]>().toEqualTypeOf<
		readonly [ShorthandPrimaryOption, number, ReadonlyArray<string>]
	>();
}, 1000);

test("defineRule rejects invalid shorthand defaults and message ids", () => {
	// @ts-expect-error invalid message ids must be rejected
	const invalidMessageId: "invalidMode" | "missingCount" = "unexpected";

	defineRule({
		create() {
			return {};
		},
		meta: {
			// @ts-expect-error defaultOptions must match the schema tuple
			defaultOptions: [{ count: 1, mode: "strict" }, "wrong", ["typed"]],
			messages: {
				invalidMode: "Mode is invalid.",
				missingCount: "Count is required.",
			},
			schema: [
				{
					properties: {
						count: { type: "integer" },
						enabled: { type: "boolean" },
						mode: { enum: ["strict", "loose"], type: "string" },
					},
					required: ["count", "mode"],
					type: "object",
				},
				{ type: "integer" },
				{
					items: { type: "string" },
					type: "array",
				},
			] as const,
		},
	});

	void invalidMessageId;
}, 1000);

test("defineRule supports root array schemas, schema defaults, and createOnce", () => {
	const createOnceRule = defineRule({
		createOnce(context) {
			const [name, options, ...levels] = context.options;

			void name;
			void options;
			void levels;

			return {};
		},
		meta: {
			defaultOptions: ["demo", {}],
			messages: {
				invalidName: "Name is invalid.",
			},
			schema: {
				additionalItems: {
					enum: ["warn", "error"],
					type: "string",
				},
				items: [
					{ type: "string" },
					{
						properties: {
							enabled: { type: "boolean" },
						},
						type: "object",
					},
				],
				type: "array",
			} as const satisfies RuleSchemaDefinition,
		},
	});
	type CreateOnceContext = InferContextFromRule<typeof createOnceRule>;

	expectTypeOf<CreateOnceContext["options"]>().toEqualTypeOf<
		readonly [string, RootArraySecondaryOption, ...ReadonlyArray<"error" | "warn">]
	>();
	const createOnceHandler: (context: CreateOnceContext) => unknown = createOnceRule.createOnce;

	const falseSchemaRule = defineRule({
		create(context) {
			void context.options;
			return {};
		},
		meta: {
			schema: false,
		},
	});
	const noSchemaRule = defineRule({
		create(context) {
			void context.options;
			return {};
		},
	});

	expectTypeOf<InferContextFromRule<typeof falseSchemaRule>["options"]>().toEqualTypeOf<ReadonlyArray<unknown>>();
	expectTypeOf<InferContextFromRule<typeof noSchemaRule>["options"]>().toEqualTypeOf<readonly []>();
	expectTypeOf<InferOptionsFromSchema<false>>().toEqualTypeOf<ReadonlyArray<unknown>>();
	expectTypeOf<InferOptionsFromSchema<undefined>>().toEqualTypeOf<readonly []>();

	void createOnceHandler;
}, 1000);

test("defineRule rejects invalid root array defaults", () => {
	defineRule({
		createOnce() {
			return {};
		},
		meta: {
			// @ts-expect-error root array schemas still reject mismatched defaults
			defaultOptions: [1, {}],
			schema: {
				additionalItems: {
					enum: ["warn", "error"],
					type: "string",
				},
				items: [
					{ type: "string" },
					{
						properties: {
							enabled: { type: "boolean" },
						},
						type: "object",
					},
				],
				type: "array",
			} as const satisfies RuleSchemaDefinition,
		},
	});
}, 1000);
