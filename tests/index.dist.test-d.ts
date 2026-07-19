import { describe, expectTypeOf, it } from "vitest";

import { definePlugin, defineRule } from "../dist/index";

import type {
	Context,
	DefaultOptionsFromSchema,
	Diagnostic,
	InferContextFromRule,
	InferOptionsFromSchema,
	InferSchemaPropertyType,
	InferSchemaType,
	OxlintSettings,
	RuleSchemaDefinition,
	RuleSchemaTypeName,
} from "../dist/index";

interface DefaultedRuntimeOption {
	readonly springHooks?: ReadonlyArray<string>;
	readonly staticGlobalFactories: ReadonlyArray<string>;
	readonly treatEmptyDepsAsViolation: boolean;
}

describe("built index exports", () => {
	it("dist declarations keep schema inference but make runtime slots sound", () => {
		const objectSchema = [
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
		] as const satisfies RuleSchemaDefinition;

		const objectRule = defineRule({
			create(context) {
				const [options] = context.options;

				expectTypeOf(options).toEqualTypeOf<DefaultedRuntimeOption | undefined>();
				return {};
			},
			meta: {
				messages: {
					unexpected: "Unexpected static hook.",
				},
				schema: objectSchema,
			},
		});
		type ObjectContext = InferContextFromRule<typeof objectRule>;

		expectTypeOf<ObjectContext["options"]>().toEqualTypeOf<readonly [DefaultedRuntimeOption | undefined]>();
		expectTypeOf<InferOptionsFromSchema<typeof objectSchema>>().toEqualTypeOf<
			readonly [
				{
					readonly springHooks?: ReadonlyArray<string>;
					readonly staticGlobalFactories?: ReadonlyArray<string>;
					readonly treatEmptyDepsAsViolation?: boolean;
				},
			]
		>();

		const arraySchema = {
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

		const arrayRule = defineRule({
			create(context) {
				const [name, options, ...levels] = context.options;

				expectTypeOf(name).toEqualTypeOf<string>();
				expectTypeOf(options).toEqualTypeOf<{ readonly enabled?: boolean } | undefined>();
				expectTypeOf(levels).toEqualTypeOf<Array<"error" | "warn">>();

				return {};
			},
			meta: {
				defaultOptions: ["demo"],
				messages: {
					invalidName: "Name is invalid.",
				},
				schema: arraySchema,
			},
		});
		type ArrayContext = InferContextFromRule<typeof arrayRule>;

		expectTypeOf<ArrayContext["options"]>().toEqualTypeOf<
			readonly [string, { readonly enabled?: boolean } | undefined, ...ReadonlyArray<"error" | "warn">]
		>();
	}, 1000);

	it("dist declarations expose schema and context helper contracts", () => {
		const enumSchema = {
			enum: ["a", "b"],
			type: "string",
		} as const;
		const tupleSchema = [enumSchema] as const;

		expectTypeOf<InferSchemaType<typeof enumSchema>>().toEqualTypeOf<"a" | "b">();
		expectTypeOf<InferSchemaPropertyType<typeof enumSchema>>().toEqualTypeOf<"a" | "b">();
		expectTypeOf<DefaultOptionsFromSchema<typeof tupleSchema>>().toEqualTypeOf<readonly [("a" | "b")?]>();
		expectTypeOf<RuleSchemaTypeName>().toEqualTypeOf<
			"any" | "array" | "boolean" | "integer" | "null" | "number" | "object" | "string"
		>();
		expectTypeOf<Context<readonly [string], "invalid">["options"]>().toEqualTypeOf<readonly [string]>();
		expectTypeOf<Parameters<Context<readonly [], "invalid">["report"]>[0]>().toEqualTypeOf<Diagnostic<"invalid">>();
		expectTypeOf<OxlintSettings["vitest"]>().toEqualTypeOf<
			{ readonly [key: string]: unknown; readonly typecheck?: boolean | undefined } | undefined
		>();
	});

	it("dist declarations preserve createOnce rules through plugins", () => {
		const rule = defineRule({
			createOnce(context) {
				expectTypeOf(context.options).toEqualTypeOf<readonly [boolean | undefined]>();
				return {};
			},
			meta: {
				messages: { invalid: "Invalid." },
				schema: [{ type: "boolean" }] as const,
			},
		});
		const plugin = definePlugin({
			rules: { typed: rule },
		});

		expectTypeOf(plugin.rules.typed.createOnce).toBeFunction();
		expectTypeOf<InferContextFromRule<typeof plugin.rules.typed>["options"]>().toEqualTypeOf<
			readonly [boolean | undefined]
		>();
		expectTypeOf<
			Parameters<InferContextFromRule<typeof rule>["report"]>[0]["messageId"]
		>().toEqualTypeOf<"invalid">();
	});
});
