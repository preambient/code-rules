# React component ownership

Rules: `react-components/const-component`, `react-components/one-component-per-file` · Presets: `frontend`, `preambient` · Autofix: none

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

<details>
<summary>Before / after</summary>

```tsx
// ❌ Rejected: two components, one declared with `function`
export function Card() {
  return <CardTitle />;
}

function CardTitle() {
  return <h2>Title</h2>;
}
```

```tsx
// ✅ card.tsx
import { CardTitle } from "./card-title";

export const Card = () => <CardTitle />;
```

</details>

---

[← Back to README](../../README.md)
