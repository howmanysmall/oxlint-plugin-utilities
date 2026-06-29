import { describe, expect, it } from "vitest";

import { definePlugin, defineRule } from "../dist/index.js";

import type { CreateRule, Plugin, Rule } from "../dist/index.js";

describe("dist defineRule()", () => {
	it("returns the same rule instance", () => {
		expect.assertions(1);

		const rule = {
			create: () => ({}),
		} as const satisfies CreateRule;

		expect(defineRule(rule)).toBe(rule);
	}, 1000);
});

describe("dist definePlugin()", () => {
	it("returns the same plugin instance", () => {
		expect.assertions(1);

		const createRule = defineRule({
			create: () => ({}),
		} as const satisfies CreateRule);
		const plugin = {
			rules: { "create-rule": createRule },
		} as const satisfies Plugin<Record<string, Rule>>;

		expect(definePlugin(plugin)).toBe(plugin);
	}, 1000);
});
