# oxlint-plugin-utilities

A typed wrapper around [Oxlint's](https://oxc.rs/) plugin and rule types.
Provides `definePlugin` and `defineRule` helper functions with stronger type
safety than the originals from `@oxlint/plugins`.

## Features

- 🛡️ **Strongly Typed**: Full type inference for rule options and message IDs.
- 🧩 **Plugin Support**: Easily bundle multiple rules into a single plugin object.
- 📦 **Re-exports**: Core and compatibility types from `@oxlint/plugins` are
  re-exported for a better DX.
- 🛠️ **Developer Friendly**: Better IDE autocompletion and error reporting.

## Install

```bash
bun add oxlint-plugin-utilities
```

Requires `typescript ^5.0` as a peer dependency.

## Usage

### Define a Rule

`defineRule` helps you create Oxlint rules with full type safety for your
`context.report` messages and rule `options`. The options tuple is inferred
from `meta.schema`, and message IDs are inferred from `meta.messages`.

```typescript
import { defineRule } from "oxlint-plugin-utilities";
export const myRule = defineRule({
  meta: {
    docs: {
      description: "Disallow use of foo",
      category: "correctness",
      url: "https://example.com/rules/my-rule",
    },
    fixable: "code",
    messages: {
      unexpectedFoo: "Unexpected usage of 'foo'.",
    },
    schema: [
      {
        properties: {
          allowList: {
            items: { type: "string" },
            type: "array",
          },
        },
        type: "object",
      },
      {
        enum: ["warn", "error"],
        type: "string",
      },
    ] as const,
  },
  create(context) {
    const [options, severity] = context.options;
    const allowList = options.allowList ?? [];

    return {
      Identifier(node) {
        if (severity === "error" && node.name === "foo" && !allowList.includes(node.name)) {
          context.report({
            node,
            messageId: "unexpectedFoo", // Type-safe message IDs
            fix(fixer) {
              return fixer.replaceText(node, "bar");
            },
          });
        }
      },
    };
  },
});
```

### Define a Plugin

`definePlugin` allows you to group rules together under a namespace.

```typescript
import { definePlugin } from "oxlint-plugin-utilities";
import { myRule } from "./rules/my-rule";

export default definePlugin({
  meta: {
    name: "my-custom-plugin",
  },
  rules: {
    "my-rule": myRule,
  },
});
```

## API

### `defineRule(rule)`

A helper to define a rule. It infers the types for `context.report`,
`context.options`, and `meta.defaultOptions` from the schema you provide.

### `definePlugin<TRules>(plugin: Plugin<TRules>)`

A helper to define a plugin object containing multiple rules.

`Plugin` uses a `meta` object for metadata, so place the plugin name under
`meta.name`, not as a top-level field.

### Re-exported Types

This package re-exports all core types used by oxlint and helper aliases:

- **Local package types**: `Context`, `CreateRule`, `CreateOnceRule`,
  `Diagnostic`, `InferContextFromRule`, `InferOptionsFromSchema`,
  `InferSchemaPropertyType`, `InferSchemaType`, `Plugin`, `Rule`,
  `RuleArraySchema`, `RuleMeta`, `RuleObjectSchema`, `RuleOptions`,
  `RuleSchema`, `RuleSchemaDefinition`, `RuleSchemaTypeName`.
- **Types from `@oxlint/plugins`**:
  `AfterHook`, `BeforeHook`, `BooleanToken`, `Comment`, `CountOptions`,
  `Definition`, `DefinitionType`, `DiagnosticData`, `Envs`, `ESTree`,
  `FilterFn`, `FilterFunction`, `Fix`, `Fixer`, `FixFn`, `FixFunction`,
  `Globals`, `IdentifierToken`, `JSXIdentifierToken`, `JSXTextToken`,
  `KeywordToken`, `LanguageOptions`, `LegacyContext`, `LegacyCreateOnceRule`,
  `LegacyCreateRule`, `LegacyDiagnostic`, `LegacyPlugin`, `LegacyRule`,
  `LegacyRuleMeta`, `LineColumn`, `Location`, `Node`, `NullToken`,
  `NumericToken`, `Options`, `PrivateIdentifierToken`, `PunctuatorToken`,
  `Range`, `Ranged`, `RangeOptions`, `Reference`, `RegularExpressionToken`,
  `RuleDeprecatedInfo`, `RuleDocs`, `RuleOptionsSchema`,
  `RuleReplacedByExternalSpecifier`, `RuleReplacedByInfo`, `Scope`,
  `ScopeManager`, `ScopeType`, `Settings`, `SkipOptions`, `SourceCode`,
  `Span`, `StringToken`, `Suggestion`, `TemplateToken`, `Token`, `Variable`,
  `Visitor`, `VisitorWithHooks`.

## License

MIT
