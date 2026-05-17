import { describe, expectTypeOf, it } from "vitest";

import { defineRule } from "../dist/index";

import type { InferContextFromRule, InferOptionsFromSchema, RuleSchemaDefinition } from "../dist/index";

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
});
