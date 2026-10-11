# Changelog

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
