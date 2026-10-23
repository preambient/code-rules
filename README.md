# Preambient code rules

## React component ownership

Define at most one React component per file, using a `const` arrow function.
This includes private and nested components, compound UI parts, Storybook example
components, and async Next.js server components. Use a separate default export
for named constants in route modules. Definition-free barrels may re-export
compound parts; keep hooks, context, types, and helpers in component-free modules
when shared across parts. Memo and forwardRef wrappers must bind to `const` and
use arrow callbacks. Ordinary utilities, hooks, server functions, and inline
render callbacks are not subject to the component declaration rule.
The rules do not auto-fix declarations: splitting closures or changing function
hoisting requires reviewing dependencies and client/server boundaries.

Private, versioned Oxlint and Oxfmt policy published as
`@preambient/code-rules` to GitHub Packages. This repository owns the settings;
application repositories import a pinned release.

The policy includes alphabetical sorting, separate runtime presets, type aliases,
and JSDoc for exported functions and public methods. Formatting
uses semicolons, double quotes for ordinary strings, trailing commas, and an
80-column width. Use template literals for interpolation and multiline content.
Additional naming and type-safety policies require a separate release.

## Profiles

| Import                                     | Purpose                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `@preambient/code-rules/base`              | Shared TypeScript/import correctness and alphabetical sorting                 |
| `@preambient/code-rules/frontend`          | Base plus native React and JSX accessibility rules and JSX prop sorting       |
| `@preambient/code-rules/react`             | Alias of the frontend preset                                                  |
| `@preambient/code-rules/backend`           | Base plus native Node rules and no console logging                            |
| `@preambient/code-rules/oxlint/preambient` | Directory-based composition, including shadcn rules and UI-package exceptions |
| `@preambient/code-rules/oxfmt`             | Shared formatting                                                             |
| `@preambient/code-rules/oxfmt/preambient`  | Formatting with monorepo generated/vendor exclusions                          |

The monorepo preset applies frontend rules to `frontend/**` and `internal/apps/**`,
backend rules to `backend/**`, and shared rules to the remaining code. Next.js
server and client modules both use the React profile; package-boundary checks
still enforce browser/backend ownership.

## Import paths

Local JavaScript and TypeScript imports must be extensionless. This includes
relative paths and local aliases beginning with `#`, `@/`, or `~/`:

```ts
import { query } from "./queries";
import type { Logger } from "#src/types";
import { createLogger } from "@/logger";
```

The rule rejects `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts`, and `.cts`
extensions on these paths, including type-only imports, re-exports, side-effect
imports, and literal dynamic imports. Query strings and fragments do not bypass
the restriction. JSON, CSS, and other asset imports retain their extensions.

Bare third-party package paths such as `pino/browser.js` and
`@vendor/package/runtime.mjs` remain allowed: these may name actual JavaScript
entry points required by the dependency. The rule does not resolve package files
or validate their existence. Use the consuming package's resolver or typechecker
to verify the target. Custom aliases should use the `#`, `@/`, or `~/` forms so the
policy can distinguish them from dependency names.

Relative imports must also reference a file in the same directory. Use package
exports or aliases for parent and child directories. For Node ESM packages,
`package.json` imports can map extensionless aliases to actual JavaScript files:

```json
{
  "imports": {
    "#src/*": "./src/*.js"
  }
}
```

Export targets, import-map targets, and file URLs still name the actual files;
the restriction applies to authored module specifiers. No automatic rewrite is
provided because removing an extension can change runtime resolution.

## Event module filenames

The Preambient preset requires a resource name in event module filenames, such as
`organizations/organization.events.ts` or `notifications/notification.events.ts`.
The `preambient/resource-event-modules` rule rejects exact `events.js`, `events.jsx`,
`events.mjs`, `events.cjs`, `events.ts`, `events.tsx`, `events.mts` and `events.cts`
filenames, including empty modules. It allows `events/index.ts`, other directory
conventions and unrelated names such as `types.ts`. It does not automatically
rename files or change imports. Existing generated/vendor exclusions still apply.

## Alphabetical sorting

All 23 Perfectionist sorting categories are covered: imports and their named
members/attributes, exports and their named members/attributes, interfaces,
object types, objects, unions, intersections, heritage clauses, JSX props, classes,
modules, enums, variables, switch cases, decorators, maps, sets, array membership
lists, and explicitly selected arrays.

Oxlint's native `sort-imports` handles named members. The remaining categories run
through pinned `eslint-plugin-perfectionist` inside Oxlint's JS plugin API; there
is no separate ESLint command or configuration. Oxfmt does not sort imports, so
formatting and linting do not compete. Imports use one alphabetical group and do
not alphabetize bare side-effect imports. The plugin's import sorter can still
move bound imports across side-effect imports, so declaration sorting requires
review.

`lint:fix` applies only the automatic fixes exposed by this package. Rewrites that
can change evaluation, iteration, or overload order are exposed as suggestions:
imports, re-exports, intersections, arrays, membership lists, objects, classes,
modules, variables, enums, decorators, maps, sets, switch cases, and JSX props.
Review suggestions in the editor, or review a scoped diff before explicitly using
Oxlint's `--fix-suggestions`. Some nested fixes require additional passes.
Intentional order outside frontend source should have a narrow `oxlint-disable` comment explaining why. Frontend exceptions belong in the shared policy registry.

Ordinary positional arrays retain their order. Only directly initialized arrays
whose variable name starts with `SORTED_` opt into array sorting. Upstream
Perfectionist 5.12.1 checks attributes on named re-exports; export-star attributes
are not covered. The adapter and compatibility tests pin that behavior rather
than claiming unsupported syntax is enforced.

## Blank lines

Every preset requires at least one blank line before and after standalone
`const`, `let`, `var`, `using`, and function declarations, including exports and
nested declarations. `const handler = () => ...` follows the same rule as other
variables. Adjacent imports stay together, with a blank line separating the
import block from other code. Overload signatures stay with their implementation.
Loop headers, object properties, and inline callbacks are not separate statements
and do not receive extra padding.

JSDoc comments require a blank line after preceding code, including object
properties, async arrow members, and class methods. The first comment in a file,
object, class, block, or other container stays next to its opening boundary.
Argument-list documentation and comments immediately after type operators stay
compact where Oxfmt removes blank lines. Documented union members with comments
before the next operator still require separation. Ordinary comments and inline comments retain their
existing formatting, and JSDoc stays attached to the member it documents.

The pinned `@stylistic/eslint-plugin` spacing rules run inside Oxlint; no separate
ESLint command is needed. Run `bun run lint:fix` to insert missing blank lines,
then `bun run format` to normalize formatting. Oxfmt preserves the blank lines,
and CI lint rejects missing spacing. Fixes preserve declaration order and attached
comments, including JSDoc.

## Install in the Preambient application

1. Give the application repository **Read** access under the package's
   **Manage Actions access** settings. Give developers package read access without
   granting write access to this source repository.
2. Commit this scope mapping in the application's `.npmrc`:

   ```ini
   @preambient:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GH_TOKEN}
   ```

3. Set `GH_TOKEN` locally to a GitHub classic PAT with `read:packages` and
   access to the private package. Keep it in an ignored `.env.local` file or your
   secret manager; never commit it. GitHub Actions should use its job token with
   `packages: read` instead of a personal token.
4. Install an exact release: `bun add --dev --exact @preambient/code-rules@0.8.3`.
5. Replace the existing root Oxc JSON configs with the two wrappers below, or run
   `bunx --no-install preambient-code-rules init` after removing the old configs.
   Initialization refuses to overwrite existing configuration.

`oxlint.config.mts`:

```ts
export { default } from "@preambient/code-rules/oxlint/preambient";
```

`oxfmt.config.mts`:

```ts
export { default } from "@preambient/code-rules/oxfmt/preambient";
```

Use these package scripts:

```json
{
  "lint": "preambient-code-rules lint && bun run check:boundaries",
  "format": "preambient-code-rules format",
  "format:check": "preambient-code-rules format:check"
}
```

The package owns and resolves its pinned tool and plugin dependencies. Application
packages that invoke `oxlint` or `oxfmt` directly, including editor integrations,
may keep matching direct tool dependencies. The local package-boundary checker
remains application-owned.

The CLI verifies both wrapper files before running. It supplies an explicit root
config, which disables nested Oxc config lookup, and accepts no flags that could
relax rules. The editor reads the same wrappers. `verify` checks wrappers without
running tools; `check` runs lint and formatting checks; `lint:fix` applies safe
lint fixes. Oxc's ordinary inline suppression mechanisms remain available.

For other repositories, select `base`, `frontend`/`react`, or `backend` and the
shared formatter. `oxlint` is also an alias for the base preset. The CLI currently
expects the Preambient monorepo wrappers; use the native tools with generic presets.

## GraphQL schemas

The `@preambient/code-rules/graphql` export owns reusable GraphQL schema policy.
Check each complete generated SDL schema with:

```sh
preambient-code-rules graphql:check customer.graphql admin.graphql
```

This command does not require Oxc wrapper files. It validates every input as a
separate complete schema, reports `file:line:column rule: message`, and exits 1
for any diagnostic or file error. It does not edit schemas or generate prose.
For application tooling, use the same policy directly:

```ts
import { checkGraphqlSchema } from "@preambient/code-rules/graphql";

const diagnostics = checkGraphqlSchema(schemaSDL, "customer.graphql");
```

The synchronous API returns `GraphqlDiagnostic[]`, whose members contain `rule`,
`message`, `sourceName`, `line`, and `column`. Locations are one-based; diagnostics
without a source location use 1. Syntax and schema-validation failures become
diagnostics instead of exceptions. The package owns its pinned `graphql` parser;
consumers pass SDL strings rather than runtime schema objects.

Policy requires PascalCase type names, camelCase fields/arguments/directives,
UPPER_SNAKE_CASE enum values, and `Input` suffixes on input objects. Query root
fields omit `get`/`fetch` prefixes. Boolean output and input-object fields begin
with `is`, `has`, or `can` followed by a capitalized name; argument names keep
the general camelCase rule. Every type,
field, argument, input field, enum value, and custom directive requires a nonempty,
non-placeholder description. Deprecated members need an explicit meaningful
reason. Reviewers still assess whether descriptions and migration advice are useful.

Mutation names start with an action verb, followed by a capitalized resource or
operation name (for example `createItem`, `grantAccess`, or `resetPassword`). Each
mutation accepts exactly `input: <MutationName>Input!` and returns its own
`<MutationName>Payload` (nullable or non-null). The verb vocabulary lives in the
versioned policy; adding verbs requires a policy release. Connections must expose
`nodes: [Resource!]!` and `pageInfo: PageInfo!`. Definitions and extensions are
checked together, including schemas with custom root type names.

Authorization, resource-specific connection naming, field nullability decisions,
pagination bounds/order/cursors, mutation error semantics, demand limits, and
breaking-change migration approvals remain application-owned contract checks.
This generic policy deliberately has no application paths or runtime dependencies
on backend packages.

## Build authentication

Every environment that installs development dependencies needs registry access,
including GitHub Actions, Render, and Docker builder stages. Grant package read
access to the application repository, set job `permissions.packages: read`, and
pass `${{ github.token }}` as `GH_TOKEN` for the install step.

For Render native builds, configure a read-only package token as a secret
`GH_TOKEN` environment variable. For Docker, pass it as a BuildKit secret
and expose it only during dependency installation:

```dockerfile
RUN --mount=type=secret,id=GH_TOKEN,required=true \
    GH_TOKEN="$(cat /run/secrets/GH_TOKEN)" \
    bun install --frozen-lockfile
```

Do not pass tokens as Docker `ARG` or `ENV`, copy `.env.local` into the build, or
place tokens in browser-visible environment variables. Verify each deployment
install path before adopting the package in the application lockfile.

## Ownership and releases

- Source repository: private, with `@davidosemwegie` as CODEOWNER.
- Release workflow: manual, `main` only, restricted to `davidosemwegie`; it validates
  the requested version, runs checks and packed-consumer tests, and publishes with
  the repository's short-lived `GITHUB_TOKEN`.
- Registry: GitHub Packages, which defaults new packages to private. Package
  visibility and read access must be verified after the first publication.
- Consumers: exact version pins and committed lockfiles. Roll back by pinning a
  previous version, then reinstalling and committing the lockfile.

The organization currently uses GitHub Free. GitHub rejects branch protection for
this private repository on that plan. CODEOWNERS documents ownership but cannot
require approval until supported branch/ruleset protections are available. Both
organization owners retain admin access. Restrict ordinary developers to package
read access; owner-only release conditions do not prevent an administrator from
editing the workflow itself.

To enforce approval for source policy changes and prevent application-side bypass,
upgrade to GitHub Team and require the owner's review and CI checks in both
repositories. Protect CODEOWNERS, workflows, dependency pins, and configuration
wrappers. The CLI is a consistency check, not an access-control boundary against
someone who can rewrite the consuming CI workflow.

For a release, update `package.json` and `CHANGELOG.md`, run `bun run check` and
`bash scripts/test-package.sh`, commit and push to `main`, then run:

```sh
gh workflow run release.yml --repo preambient/code-rules --ref main -f version=0.8.3
```

A new policy requires a new version; never replace an existing published version.
The package deliberately omits `private: true` because that field blocks all npm
publishing. Privacy is controlled by GitHub repository/package permissions.

## References

- [GitHub Packages npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [Package access settings](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility)
- [Protected branch availability](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [Oxlint configuration](https://oxc.rs/docs/guide/usage/linter/config)
- [Oxfmt configuration](https://oxc.rs/docs/guide/usage/formatter/config)

### Type definitions

Use `type` aliases instead of `interface` declarations. Every preset enforces
`typescript/consistent-type-definitions: ["error", "type"]`. Convert inheritance
to intersections after reviewing member compatibility and declaration merging.

### Function documentation

Exported functions and public methods need an attached `/** ... */` JSDoc block
explaining their behavior, arguments, and results. This covers direct and separate
exports, default exports, public class methods, and methods on exported objects.
Private helpers, inline callbacks, event handlers, and test callbacks do not need
JSDoc merely because they are functions. Function type signatures have no
implementation and do not require these blocks. Generated/vendor exclusions apply.

`jsdoc-js/require-jsdoc` runs inside Oxlint in every preset. A small adapter
limits missing-doc reports to module-exported implementations, following aliases
and object/class members without traversing function bodies or arbitrary calls. Keep
meaningful documentation on private helpers where constraints, side effects, or
failure behavior warrant it; use a short ordinary comment when explaining only
why a particular implementation choice exists. Do not restate obvious `map`,
`filter`, or test behavior in a full documentation block.

Any JSDoc that is present is still validated: summaries cannot be empty or
placeholders, every argument needs a matching `@param` with a description, and
returned values need `@returns`. Async functions describe promise resolution,
including completion without a value; generators use `@yields`. Destructured
arguments use a descriptive root alias; nested property tags are optional.
TypeScript remains the source of types, so repeating `{types}` is optional.
Lint never invents descriptions or inserts stub comments. Reviewers check that
the prose describes actual behavior.

Export analysis is static. Functions passed to wrappers or returned by factories
are not treated as public merely because they appear inside an exported
expression; describe their contract on the enclosing API and keep separate docs
where useful. Rest destructuring, dynamic property names or mutations, inherited
methods, and prototype/namespace exports still need review rather than inferred
function exposure.

Document the API while keeping its straightforward implementation readable:

```ts
/**
 * Normalize configured origins before validating them.
 * @param configured - Comma-separated HTTP origins.
 * @returns Nonempty origins with surrounding whitespace removed.
 */
export function normalizeOrigins(configured: string) {
  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
```

## UI text and component contracts

The Preambient preset combines pinned `@shadcn/lint` rules with
`ui-policy/ui-contracts` for `frontend/**` and `internal/apps/**`. Use the shared
`Typography.h1` through `.h6`, `.p`, and semantic inline/list members for authored
text. This includes stories, pages, templates, and compositions. Plain text is
allowed inside registered text-owning primitive exports: buttons, badges, labels,
select options, dialog titles/descriptions, and the equivalent canonical parts.
Structural containers are not text owners.

Only the exact implementation files in `src/ui-policy.js` may define canonical
appearance. A new file in the UI package is subject to the same policy as an app.
At call sites, use canonical `variant`, `size`, `tone`, and `align` props;
`className` may arrange or place a component, including full-width controls.
Padding, heights, shape, and selected-state styling belong in the primitive.
Typography lists allow layout gaps because UI layouts own spacing; their
canonical indentation remains protected.
Direct lower-level primitive imports and raw React `createElement` text/controls
are checked too. The CLI ignores nested Oxlint configurations so they cannot
disable the root contract. Native control recreation, inline styles, and typography utility classes on
layout containers are rejected. Import aliases and simple component aliases are
resolved; conditional/constant class expressions are inspected.

A function may forward slots explicitly typed `ReactNode` (including optional
slots, props type aliases, `Readonly`, and `PropsWithChildren`). String-valued
props and arbitrary expressions need a text owner. Avoid typing copy as
`ReactNode` to circumvent the contract. This is an authored-source rule, not a
runtime proof of values received from external data.

The shared CLI also parses frontend CSS and rejects text declarations, canonical
component selector overrides, and `@apply` outside the named theme/Typography
stylesheets. Inline frontend lint suppressions are rejected by this check. The sole existing
non-UI exception is the exact next-intl declaration-merging directive in
`frontend/packages/i18n/src/frontend/index.ts`; it cannot suppress UI rules.
The vendor Typeset stylesheet and the existing scoped Storybook overview MDX
wrapper remain explicit exceptions. MDX keeps its current Typeset rendering.
Add any necessary exception centrally, with a reason and policy fixtures, and
release a new package version. The generic presets retain no application paths.
