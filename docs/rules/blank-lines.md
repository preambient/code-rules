# Blank lines

Presets: all · Autofix: yes (`lint:fix`)

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

---

[← Back to README](../../README.md)
