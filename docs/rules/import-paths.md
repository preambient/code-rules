# Import paths

Presets: all · Autofix: none

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

---

[← Back to README](../../README.md)
