# Alphabetical sorting

Presets: all · Autofix: safe fixes plus editor suggestions

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

---

[← Back to README](../../README.md)
