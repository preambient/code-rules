# Type aliases and JSDoc

Presets: all · Autofix: none

Use `type` aliases instead of `interface` declarations. Every preset enforces
`typescript/consistent-type-definitions: ["error", "type"]`. Convert inheritance
to intersections after reviewing member compatibility and declaration merging.

## Function documentation

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

---

[← Back to README](../../README.md)
