import { describe, expect, test } from "vitest";

import { definePlugin, defineRule } from "../src/index";

import type { CreateRule, Plugin, Rule } from "../src/index";

describe("defineRule()", () => {
	test("returns the same rule instance", () => {
		const rule = {
			create: () => ({}),
		} as const satisfies CreateRule;

		expect(defineRule(rule)).toBe(rule);
	}, 1000);
});

describe("definePlugin()", () => {
	test("returns the same plugin instance", () => {
		const createRule = defineRule({
			create: () => ({}),
		} as const satisfies CreateRule);
		const plugin = {
			rules: { "create-rule": createRule },
		} as const satisfies Plugin<Record<string, Rule>>;

		expect(definePlugin(plugin)).toBe(plugin);
	}, 1000);
});
