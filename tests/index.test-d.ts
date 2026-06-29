import { describe, expect, expectTypeOf, it } from "vitest";

import { definePlugin, defineRule } from "#src";

import type {
	CreateRule,
	InferContextFromRule,
	InferOptionsFromSchema,
	InferSchemaType,
	RuleMeta,
	RuleSchema,
	RuleSchemaDefinition,
	Visitor,
} from "#src";

interface ShorthandPrimaryOption {
	readonly count: number;
	readonly enabled?: boolean;
	readonly mode: "loose" | "strict";
}

interface DefaultedRuntimeOption {
	readonly springHooks?: ReadonlyArray<string>;
	readonly staticGlobalFactories: ReadonlyArray<string>;
	readonly treatEmptyDepsAsViolation: boolean;
}

describe("root project testing", () => {
	it("InferSchemaType covers primitive keywords and enum subtraction", () => {
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

		expectTypeOf<InferSchemaType<typeof unionSchema>>().toEqualTypeOf<string | null>();
		expectTypeOf<InferSchemaType<typeof excludedEnumSchema>>().toEqualTypeOf<"error">();
	}, 1000);

	it("defineRule keeps schema helpers but makes tuple slots optional without meta.defaultOptions", () => {
		const schema = [
			{
				enum: ["always", "never"],
				type: "string",
			},
		] as const;

		const rule = defineRule({
			create(context) {
				const [mode] = context.options;

				expectTypeOf(mode).toEqualTypeOf<"always" | "never" | undefined>();

				return {};
			},
			meta: {
				messages: {
					unexpected: "Unexpected mode.",
				},
				schema,
			},
		});
		type RuleContext = InferContextFromRule<typeof rule>;

		expectTypeOf<RuleContext["options"]>().toEqualTypeOf<readonly [("always" | "never") | undefined]>();
		expectTypeOf<InferOptionsFromSchema<typeof schema>>().toEqualTypeOf<readonly ["always" | "never"]>();
	}, 1000);

	it("property defaults do not create the option slot", () => {
		const rule = defineRule({
			create(context) {
				const [options] = context.options;

				expectTypeOf(options).toEqualTypeOf<DefaultedRuntimeOption | undefined>();
				expectTypeOf<NonNullable<typeof options>>()
					.toHaveProperty("staticGlobalFactories")
					.toEqualTypeOf<ReadonlyArray<string>>();
				expectTypeOf<NonNullable<typeof options>>()
					.toHaveProperty("treatEmptyDepsAsViolation")
					.toEqualTypeOf<boolean>();

				// @ts-expect-error the slot itself is not guaranteed without meta.defaultOptions
				void options.staticGlobalFactories;

				return {};
			},
			meta: {
				messages: {
					unexpected: "Unexpected static hook.",
				},
				schema: [
					{
						additionalProperties: false,
						properties: {
							springHooks: {
								items: { type: "string" },
								type: "array",
							},
							staticGlobalFactories: {
								default: ["makeSpring"],
								items: { type: "string" },
								type: "array",
							},
							treatEmptyDepsAsViolation: {
								default: true,
								type: "boolean",
							},
						},
						type: "object",
					},
				] as const,
			},
		});
		type RuleContext = InferContextFromRule<typeof rule>;

		expectTypeOf<RuleContext["options"]>().toEqualTypeOf<readonly [DefaultedRuntimeOption | undefined]>();
	}, 1000);

	it("meta.defaultOptions guarantees slot presence and preserves schema defaults inside the slot", () => {
		const rule = defineRule({
			create(context) {
				const [options] = context.options;

				expectTypeOf(options).toEqualTypeOf<DefaultedRuntimeOption>();
				expectTypeOf(options.staticGlobalFactories).toEqualTypeOf<ReadonlyArray<string>>();
				expectTypeOf(options.treatEmptyDepsAsViolation).toEqualTypeOf<boolean>();

				return {};
			},
			meta: {
				defaultOptions: [{}],
				messages: {
					unexpected: "Unexpected static hook.",
				},
				schema: [
					{
						additionalProperties: false,
						properties: {
							springHooks: {
								items: { type: "string" },
								type: "array",
							},
							staticGlobalFactories: {
								default: ["makeSpring"],
								items: { type: "string" },
								type: "array",
							},
							treatEmptyDepsAsViolation: {
								default: true,
								type: "boolean",
							},
						},
						type: "object",
					},
				] as const,
			},
		});
		type RuleContext = InferContextFromRule<typeof rule>;

		expectTypeOf<RuleContext["options"]>().toEqualTypeOf<readonly [DefaultedRuntimeOption]>();
	}, 1000);

	it("tuple shorthand applies meta.defaultOptions per fixed slot", () => {
		const rule = defineRule({
			create(context) {
				const [primary, retries, tags] = context.options;

				expectTypeOf(primary).toEqualTypeOf<ShorthandPrimaryOption>();
				expectTypeOf(retries).toEqualTypeOf<number | undefined>();
				expectTypeOf(tags).toEqualTypeOf<ReadonlyArray<string> | undefined>();

				return {};
			},
			meta: {
				defaultOptions: [{ count: 1, mode: "strict" }],
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

		expectTypeOf<RuleContext["options"]>().toEqualTypeOf<
			readonly [ShorthandPrimaryOption, number | undefined, ReadonlyArray<string> | undefined]
		>();

		const plugin = definePlugin({
			rules: {
				typed: rule,
			},
		});
		type PluginContext = InferContextFromRule<(typeof plugin.rules)["typed"]>;

		expectTypeOf<PluginContext["options"]>().toEqualTypeOf<
			readonly [ShorthandPrimaryOption, number | undefined, ReadonlyArray<string> | undefined]
		>();
	}, 1000);

	it("root array schemas keep fixed slots optional without defaults", () => {
		const schema = {
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
		} as const satisfies RuleSchemaDefinition;

		const rule = defineRule({
			create(context) {
				const [name, options, ...levels] = context.options;

				expectTypeOf(name).toEqualTypeOf<string | undefined>();
				expectTypeOf(options).toEqualTypeOf<{ readonly enabled?: boolean } | undefined>();
				expectTypeOf(levels).toEqualTypeOf<Array<"error" | "warn">>();

				return {};
			},
			meta: {
				messages: {
					invalidName: "Name is invalid.",
				},
				schema,
			},
		});
		type RuleContext = InferContextFromRule<typeof rule>;

		expectTypeOf<RuleContext["options"]>().toEqualTypeOf<
			readonly [
				string | undefined,
				{ readonly enabled?: boolean } | undefined,
				...ReadonlyArray<"error" | "warn">,
			]
		>();
	}, 1000);

	it("schema false and missing schema keep their existing behavior", () => {
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
	}, 1000);

	it("public rule metadata types accept schema-compatible default options", () => {
		expect.assertions(1);

		type Schema = readonly [
			{
				readonly properties: {
					readonly flag: {
						readonly default: true;
						readonly type: "boolean";
					};
				};
				readonly type: "object";
			},
		];

		const meta = {
			defaultOptions: [{}],
			messages: {
				ok: "Ok.",
			},
			schema: [
				{
					properties: {
						flag: {
							default: true,
							type: "boolean",
						},
					},
					type: "object",
				},
			] as const,
		} satisfies RuleMeta<Schema, "ok", readonly [{ readonly flag?: boolean }]>;

		const rule = {
			create(): Visitor {
				return {};
			},
			meta,
		} satisfies CreateRule<Schema, "ok", readonly [{ readonly flag?: boolean }]>;

		expect(meta.defaultOptions).toStrictEqual([{}]);
		void rule;
	}, 1000);
});
