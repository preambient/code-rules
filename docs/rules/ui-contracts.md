# UI text and component contracts

Presets: `preambient` · Autofix: none

> These contracts encode the Preambient design system (shared `Typography`, registered shadcn primitives). They are published as a worked example of enforcing a UI contract with Oxlint JS plugins; fork the registry in `src/ui-policy.js` to adapt them.

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

---

[← Back to README](../../README.md)
