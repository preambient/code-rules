# Event module filenames

Presets: `preambient` · Autofix: none

The Preambient preset requires a resource name in event module filenames, such as
`organizations/organization.events.ts` or `notifications/notification.events.ts`.
The `preambient/resource-event-modules` rule rejects exact `events.js`, `events.jsx`,
`events.mjs`, `events.cjs`, `events.ts`, `events.tsx`, `events.mts` and `events.cts`
filenames, including empty modules. It allows `events/index.ts`, other directory
conventions and unrelated names such as `types.ts`. It does not automatically
rename files or change imports. Existing generated/vendor exclusions still apply.

---

[← Back to README](../../README.md)
