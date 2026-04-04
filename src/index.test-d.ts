import { expectType } from "tsd";

import { definePlugin, defineRule } from "./index";

import type { CreateRule, Plugin, Rule } from "./index";

const rule: CreateRule = { create: () => ({}) };
const plugin: Plugin<Record<string, Rule>> = { rules: { "test-rule": rule } };

expectType(defineRule(rule));
expectType(definePlugin(plugin));
