# Changelog

## 0.8.1

- Require a blank line before JSDoc after preceding code, including object and
  class members, with safe whitespace autofixes in every preset. Preserve compact
  container openings and ordinary or inline comments.
- Verify object async arrow members, class methods, and top-level comments through
  lint fixes, Oxfmt round trips, and packed consumers.

## 0.8.0

- Add a reusable GraphQL SDL checker and typed `./graphql` export for naming,
  descriptions, explicit deprecation reasons, mutation input/payload conventions,
  and connection shape. Require descriptive query root names and `is`/`has`/`can`
  Boolean field prefixes. Return actionable syntax, schema, and policy diagnostics.
- Add `graphql:check` CLI support for multiple complete schemas without requiring
  Oxc wrappers. Pin the GraphQL parser and test accepted/rejected schemas through
  source, packed, and published consumer workflows.

## 0.7.0

- Require a blank line around variable and function declarations, including
  exported declarations and functions assigned to `const`, in every preset.
- Keep imports contiguous with a blank line before the following code; preserve
  attached JSDoc, compact overload signatures, loop headers, and inline callbacks.
- Run the pinned Stylistic spacing rule through Oxlint with safe whitespace fixes;
  verify compatibility with Oxfmt in source, packed, and published consumers.

## 0.6.0

- Require JSDoc on exported functions and public methods rather than every
  implementation. Inline callbacks, private helpers, test callbacks, and private
  or protected class methods no longer need documentation solely to satisfy lint.
- Continue validating descriptions, parameter names and descriptions, returned
  values, async completion, and yields whenever JSDoc is present.
- Add regression tests for nested origin trimming, integration filters, hooks,
  test callbacks, separate exports, and public versus private methods.

## 0.5.0

- Require descriptive, valid JSDoc on every function implementation, including
  inline callbacks, methods, constructors, accessors, helpers, and test callbacks.
- Validate JSDoc syntax with the pinned JSDoc plugin; reject empty
  summaries and placeholders without generating stub comments.
- Require matching `@param` names and descriptions, `@returns` descriptions for
  returned values and async completion, and `@yields` descriptions for generators.
  Destructured arguments require a root description; TypeScript type duplication
  and nested property tags remain optional.
- Test documentation enforcement across all runtime presets and function forms.

## 0.4.0

- Require TypeScript type aliases instead of interfaces in every preset.
- Test accepted aliases and rejected interfaces in frontend, backend, and shared code.

## 0.3.1

- Exclude Next.js-generated `next-env.d.ts` declarations from linting; handwritten
  imports continue to follow the same-directory policy.

## 0.3.0

- Restrict relative imports to files in the same directory across all presets;
  require package exports or aliases for parent and child directories.

## 0.2.0

- Add base, frontend/React, backend, and composed monorepo presets.
- Cover all 23 Perfectionist sorting categories through Oxlint.
- Require review for fixes that can change runtime or overload order.
- Add compatibility and non-reordering regression tests.

## 0.1.1

- Normalize npm CLI metadata and verify installation from the published registry.

## 0.1.0

- Extract the existing Preambient Oxlint and Oxfmt policy into a private package.
- Preserve double quotes, semicolons, trailing commas, and an 80-column width.
- Provide generic presets and the Preambient monorepo's shadcn and backend rules.
- Pin Oxlint 1.86.0, Oxfmt 0.72.0, and @shadcn/lint 0.2.0.
- Add a CLI that verifies the consuming configuration and uses the package's tools.
