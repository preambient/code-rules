# Preambient code rules

Private, versioned Oxlint and Oxfmt policy published as
`@preambient/code-rules` to GitHub Packages. This repository owns the settings;
application repositories import a pinned release.

The policy includes alphabetical sorting, separate runtime presets, type aliases,
and JSDoc for exported functions and public methods. Formatting
uses semicolons, double quotes for ordinary strings, trailing commas, and an
80-column width. Use template literals for interpolation and multiline content.
Naming and additional type-safety policies require a separate release.

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
Intentional order should have a narrow `oxlint-disable` comment explaining why.

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

The pinned `@stylistic/eslint-plugin` spacing rule runs inside Oxlint; no separate
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
4. Install an exact release: `bun add --dev --exact @preambient/code-rules@0.7.0`.
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
gh workflow run release.yml --repo preambient/code-rules --ref main -f version=0.2.0
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
