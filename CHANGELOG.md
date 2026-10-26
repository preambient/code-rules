# Changelog

## 0.12.0

- **Breaking (Preambient presets):** follow the monorepo's `apps/*` and `packages/*`
  layout. Frontend, shadcn/ui, and UI contract rules now apply to `apps/console`,
  `apps/platform`, `packages/ui`, and `packages/i18n/src/frontend`; backend rules
  apply to `apps/agent-runtime-worker`, `apps/documents-worker`, and
  `packages/backend`. The legacy `frontend/**`, `internal/apps/**`, and
  `backend/**` globs no longer match anything special. Other shared packages keep
  the base rules.
- Move the canonical primitive, Storybook document, and stylesheet registries to
  `packages/ui`, and the next-intl suppression exception to
  `packages/i18n/src/frontend/index.ts`.
- Recognize shared UI imports from `@workspace/ui` instead of `@repo/ui`.
- Register the shadcn compound primitives in `packages/ui`: attachment, bubble,
  code-block, collapsible, hover-card, message, popover, trace, and
  message-scroller, plus `LoadingButton`. Their implementation files own
  appearance, and their text-owning parts (titles, descriptions, triggers,
  buttons, `BubbleContent`, `CodeBlockContent`, `MessageHeader`, `MessageFooter`,
  and `TraceLine`) accept plain text. Their structural parts stay protected.
- UI contracts read `ReactNode` slots from props types exported by
  `@workspace/ui/components/*` modules, such as a compound part's `shared.tsx`.
- UI contracts accept `null | ReactNode` slots, the order `sort-union-types`
  produces. Before, only `ReactNode | null` was recognized.
- UI contracts let inline `map`, `flatMap`, and `Array.from` callbacks forward
  declared slots of the enclosing component, including block-bodied callbacks.
- UI contracts no longer read comparison operands such as `align === "start"` as
  class names.
- Drop the stale `backend/packages/db/.drizzle/` formatter exclusion.
- Test that each frontend and backend directory receives its rules and that
  legacy and shared directories do not.

## 0.11.0

- **Breaking:** remove the GraphQL SDL checker, including the `./graphql` export,
  the `graphql:check` CLI command, and the pinned `graphql` dependency. Pin
  `@preambient/code-rules@0.10.x` to keep using it.
- Remove the Preambient preset's ordering and spacing exemption for GraphQL Code
  Generator outputs.
- **Breaking:** rename the package to `@preambient-labs/code-rules` and publish it
  publicly to npmjs.org with provenance. Installs no longer need a registry token or
  `.npmrc`. Update `oxlint.config.mts` and `oxfmt.config.mts` wrappers to the new
  name; the CLI rejects the old wrapper contents.
- License the package under MIT.
- Rewrite the README for external adopters and move detailed rule documentation
  to `docs/rules/`.

## 0.10.0

- Require one React component definition per file, including compound primitives,
  private helpers, nested components, Storybook examples, and async server components.
- Require React components to use `const` arrow functions. Ordinary utilities,
  hooks, server operations, and inline render callbacks may still use functions.
- Apply both rules in the generic frontend preset and the Preambient preset,
  independent of application directory layout. Definition-free re-export barrels
  preserve compound component APIs without exemptions.
- Register the exact split primitive parts and shared implementation files, keeping
  direct imports' text ownership without introducing directory-wide exemptions.

## 0.9.0

- Require extensionless local JavaScript and TypeScript imports, including relative
  paths and `#`, `@/`, and `~/` aliases, across all presets. Preserve bare third-party
  entry points such as `pino/browser.js` and asset imports such as JSON and CSS.
- Keep the same-directory relative import restriction. Check static, type-only,
  side-effect, re-export, and literal dynamic imports through source and packed consumers.
- Use extensionless package aliases inside this package so its Node ESM modules
  follow the same policy without changing their published entry points.

## 0.8.6

- Register the exact Atomic Design paths for shadcn skeleton, dropdown menu, empty, table, tooltip, dialog, and sidebar primitives, plus the tooltip provider. Keep appearance and text ownership scoped to canonical implementations and named parts.
- Cover composition of the new primitives and rejection of styling and text-owner escapes through source and packed consumers.

## 0.8.5

- Accept JSX-only render props in the UI text contract; continue rejecting returned strings and unowned text.
- Exempt the two named Core GraphQL Code Generator outputs from ordering and spacing rules while retaining correctness, import and UI checks. Generated output remains subject to schema, type, formatting and freshness checks in Core.

## 0.8.4

- Require compound Typography or registered text-owning primitive parts for authored UI text. Check native tags, fragments, dynamic expressions, aliases, and declared ReactNode slot forwarding.
- Replace the UI directory exemption with an explicit canonical primitive file registry. Reject native control recreation, appearance overrides, inline styles, inherited typography classes, and frontend inline lint suppressions.
- Check authored CSS through the shared CLI; keep theme, Typography, vendor Typeset, and the existing MDX surface as narrow named exceptions. Pin PostCSS for stylesheet parsing.
- Cover positive and negative contracts through the real CLI and packed consumers.

## 0.8.3

- Require resource-prefixed event module filenames in the Preambient preset.
  Reject exact `events` JavaScript/TypeScript module basenames while allowing
  names such as `organization.events.ts`, event directories and other filenames.
- Verify filename policy through the real Oxlint CLI and packed/published consumers.

## 0.8.2

- Preserve compact JSDoc at type alias openings and after type operators where
  required by Oxfmt, including generated union types, so spacing fixes remain
  stable after formatting. Comments before subsequent union members still
  require separation from preceding code.

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
