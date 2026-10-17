import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import postcss from "postcss";

const stylesheets = new Set([
  "frontend/packages/ui/.storybook/preview.css",
  "frontend/packages/ui/src/styles/globals.css",
  "frontend/packages/ui/src/styles/typeset.css",
  "frontend/packages/ui/src/styles/typography.css",
]);

// next-intl augments its public interface; a type alias cannot merge declarations.
const suppressionExceptions = {
  "frontend/packages/i18n/src/frontend/index.ts": new Set([
    "oxlint-disable-next-line typescript/consistent-type-definitions",
  ]),
};

const generated = new Set([
  ".git",
  ".next",
  ".source",
  ".worktrees",
  "dist",
  "node_modules",
  "out",
  "storybook-static",
]);

/** Check handwritten frontend CSS and reject inline policy suppressions before Oxlint runs.
 * @param root - Consumer project directory.
 * @returns Human-readable diagnostics for contracts that require stylesheet inspection.
 */
function checkUiStyles(root) {
  const diagnostics = [];

  /** Recursively inspect authored source files without following directory symlinks.
   * @param directory - Existing source directory to scan.
   */
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);

      if (entry.isDirectory()) {
        if (!generated.has(entry.name)) visit(file);
        continue;
      }
      if (!entry.isFile() || !/\.(?:css|[cm]?[jt]sx?)$/u.test(entry.name))
        continue;

      const name = relative(root, file).replaceAll("\\", "/");

      const content = readFileSync(file, "utf8");

      // UI policy exceptions belong in the versioned registry, not local disables.
      for (const match of content.matchAll(
        /(?:^|\n)\s*(?:\{\s*)?(?:\/\/|\/\*)\s*((?:oxlint|eslint)-disable(?:-next-line|-line)?(?:[^\n]*))/gu,
      )) {
        if (suppressionExceptions[name]?.has(match[1].trim())) continue;
        diagnostics.push(
          `${name}: ui-contracts: Inline lint suppressions are not allowed in frontend source; document a narrow exception in the shared policy.`,
        );
      }
      if (!entry.name.endsWith(".css") || stylesheets.has(name)) continue;
      try {
        const css = postcss.parse(content, { from: file });

        css.walkDecls((declaration) => {
          if (
            /^(?:color|font(?:-.+)?|line-height|letter-spacing|text-.+|--(?:font|typeset|ui-font|ui-text|tracking).*)$/u.test(
              declaration.prop,
            )
          )
            diagnostics.push(
              `${name}:${declaration.source.start.line}: ui-contracts: Text styles belong in the shared typography preset or canonical primitive.`,
            );
        });
        css.walkRules((rule) => {
          if (
            /(?:\[data-slot|\.typography\b|(?:^|[\s>+~,])(?:button|input|select|textarea)(?:[\s.:#[>+~,]|$))/u.test(
              rule.selector,
            )
          )
            diagnostics.push(
              `${name}:${rule.source.start.line}: ui-contracts: Do not override canonical component selectors; add a variant in the primitive.`,
            );
        });
        css.walkAtRules("apply", (rule) => {
          diagnostics.push(
            `${name}:${rule.source.start.line}: ui-contracts: Keep @apply in canonical stylesheets; use component variants and layout classes.`,
          );
        });
      } catch (error) {
        diagnostics.push(`${name}: ui-contracts: ${error.message}`);
      }
    }
  }

  for (const directory of ["frontend", "internal/apps"])
    if (existsSync(join(root, directory))) visit(join(root, directory));
  return diagnostics;
}

export { checkUiStyles };
