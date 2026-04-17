import { expectTypeOf, test } from "vitest";

import { defineRule } from "../dist/index";

import type { InferContextFromRule, InferOptionsFromSchema, RuleSchemaDefinition } from "../dist/index";

test("dist declarations expose the schema-driven rule surface", () => {
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
			schema,
		},
	});

	type RuleContext = InferContextFromRule<typeof rule>;
	type RuleOptions = InferOptionsFromSchema<typeof schema>;

	expectTypeOf<RuleContext["options"]>().toEqualTypeOf<
		readonly [string, { readonly enabled?: boolean }, ...ReadonlyArray<"error" | "warn">]
	>();
	expectTypeOf<RuleOptions>().toEqualTypeOf<
		readonly [string, { readonly enabled?: boolean }, ...ReadonlyArray<"error" | "warn">]
	>();

	defineRule({
		create() {
			return {};
		},
		meta: {
			// @ts-expect-error invalid defaults must fail through the published declarations
			defaultOptions: [1, {}],
			schema: {
				items: [{ type: "string" }],
				type: "array",
			} as const satisfies RuleSchemaDefinition,
		},
	});

	void rule;
}, 1000);
