import { describe, expectTypeOf, it } from "vitest";

import { definePlugin, defineRule } from "#src";

import type { DefaultOptionsFromSchema, Diagnostic, InferContextFromRule } from "#src";

describe("rule and plugin type inference", () => {
	it("preserves createOnce rules and their inferred options", () => {
		const rule = defineRule({
			createOnce(context) {
				expectTypeOf(context.options).toEqualTypeOf<readonly [("always" | "never") | undefined]>();
				return {};
			},
			meta: {
				messages: {
					unexpected: "Unexpected mode.",
				},
				schema: [
					{
						enum: ["always", "never"],
						type: "string",
					},
				] as const,
			},
		});

		expectTypeOf(rule.createOnce).toBeFunction();
		expectTypeOf<InferContextFromRule<typeof rule>["options"]>().toEqualTypeOf<
			readonly [("always" | "never") | undefined]
		>();
	});

	it("preserves createOnce on hybrid rules", () => {
		const rule = defineRule({
			create() {
				return {};
			},
			createOnce() {
				return {};
			},
		});

		expectTypeOf(rule.create).toBeNullable();
		expectTypeOf(rule.createOnce).toBeFunction();
	});

	it("applies property defaults through local references", () => {
		const rule = defineRule({
			create(context) {
				const [options] = context.options;

				expectTypeOf(options).toEqualTypeOf<{ readonly enabled: boolean } | undefined>();
				return {};
			},
			meta: {
				schema: [
					{
						$ref: "#/definitions/options",
						definitions: {
							options: {
								properties: {
									enabled: { default: true, type: "boolean" },
								},
								type: "object",
							},
						},
					},
				] as const,
			},
		});

		expectTypeOf<InferContextFromRule<typeof rule>["options"]>().toEqualTypeOf<
			readonly [{ readonly enabled: boolean } | undefined]
		>();
	});

	it("infers message IDs for report diagnostics", () => {
		const rule = defineRule({
			create(context) {
				type ReportDiagnostic = Parameters<typeof context.report>[0];

				expectTypeOf<ReportDiagnostic["messageId"]>().toEqualTypeOf<"first" | "second">();
				expectTypeOf<ReportDiagnostic>().toEqualTypeOf<Diagnostic<"first" | "second">>();
				return {};
			},
			meta: {
				messages: {
					first: "First message.",
					second: "Second message.",
				},
			},
		});
		type RuleContext = InferContextFromRule<typeof rule>;

		expectTypeOf<Parameters<RuleContext["report"]>[0]["messageId"]>().toEqualTypeOf<"first" | "second">();
	});

	it("rejects default options outside the schema", () => {
		const schema = [
			{
				enum: ["always", "never"],
				type: "string",
			},
		] as const;

		expectTypeOf<DefaultOptionsFromSchema<typeof schema>>().toEqualTypeOf<readonly [("always" | "never")?]>();

		defineRule({
			create() {
				return {};
			},
			meta: {
				// @ts-expect-error the default must match the schema enum
				defaultOptions: ["sometimes"],
				schema,
			},
		});

		defineRule({
			create() {
				return {};
			},
			meta: {
				// @ts-expect-error the schema defines only one fixed option slot
				defaultOptions: ["always", "extra"],
				schema,
			},
		});
	});

	it("preserves each named rule through definePlugin", () => {
		const regular = defineRule({
			create() {
				return {};
			},
		});
		const once = defineRule({
			createOnce() {
				return {};
			},
		});
		const plugin = definePlugin({
			meta: { name: "example" },
			rules: {
				once,
				regular,
			},
		});

		expectTypeOf<keyof typeof plugin.rules>().toEqualTypeOf<"once" | "regular">();
		expectTypeOf(plugin.rules.once).toEqualTypeOf<typeof once>();
		expectTypeOf(plugin.rules.regular).toEqualTypeOf<typeof regular>();

		definePlugin({
			rules: {
				// @ts-expect-error plugin rule entries must implement an Oxlint rule
				invalid: {},
			},
		});
	});
});
