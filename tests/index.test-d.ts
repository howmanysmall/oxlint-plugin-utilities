import { expectTypeOf, test } from "vitest";

import { definePlugin, defineRule } from "../src/index";

import type { InferContextFromRule } from "../src/index";

interface ExampleOptions {
	readonly count: number;
	readonly enabled: boolean;
	readonly mode: "loose" | "strict";
}

test("defineRule infers options from schema and message ids", () => {
	const rule = defineRule({
		create: () => ({}),
		meta: {
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
					type: "object",
				},
			] as const,
		},
	});
	type ExampleContext = InferContextFromRule<typeof rule>;
	type ExampleDiagnostic = Parameters<ExampleContext["report"]>[0];

	expectTypeOf<ExampleContext["options"]>().toEqualTypeOf<readonly [ExampleOptions]>();
	expectTypeOf<ExampleDiagnostic["messageId"]>().toEqualTypeOf<"invalidMode" | "missingCount">();

	const plugin = definePlugin({
		rules: {
			typed: rule,
		},
	});
	type PluginContext = InferContextFromRule<(typeof plugin.rules)["typed"]>;

	expectTypeOf<PluginContext["options"]>().toEqualTypeOf<readonly [ExampleOptions]>();

	// @ts-expect-error invalid message ids must be rejected
	const invalidMessageId: ExampleDiagnostic["messageId"] = "unexpected";

	void invalidMessageId;
}, 1000);

test("defineRule defaults options to an empty record without schema", () => {
	const rule = defineRule({
		create: () => ({}),
	});
	type DefaultContext = InferContextFromRule<typeof rule>;

	expectTypeOf<DefaultContext["options"]>().toEqualTypeOf<readonly [Record<string, never>]>();
}, 1000);
