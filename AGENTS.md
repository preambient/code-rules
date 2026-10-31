# Code rules ownership

This repository owns Preambient's shared Oxlint and Oxfmt policies.

- Always use Namespace runners (`namespace-profile-preambient`) for GitHub Actions
  CI and release workflows. Do not use GitHub-hosted runners.

- Keep the generic presets free of application-specific paths; put monorepo
  exceptions in the `preambient` presets.
- Use double quotes for ordinary strings, semicolons, and template literals for
  interpolation or multiline content.
- A policy or tool-version change is a versioned release. Update the changelog and
  test both permitted and rejected examples before releasing.
- Run `bun run check` and verify the packed package before publishing.
- Publish only through the Release workflow on `main`, to npmjs.org as
  `@preambient-labs/code-rules`. Do not publish to GitHub Packages or under
  another scope.
- Never commit registry tokens, package tarballs, or generated output.
- Only the coordinator commits, pushes, and releases integrated changes.
