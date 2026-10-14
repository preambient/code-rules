import { basename } from "node:path";

// Filename diagnostics cannot safely rename files or update their consumers.
export default {
  rules: {
    "resource-event-modules": {
      /** Report generic event modules without imposing a directory convention.
       * @param context - Linter context containing the authored filename and reporter.
       * @returns A program visitor only for exact generic event module filenames.
       */
      create(context) {
        if (
          !/^events\.(?:[cm]?[jt]s|[jt]sx)$/u.test(basename(context.filename))
        )
          return {};
        return {
          /** Attach the filename diagnostic to the module, including empty files.
           * @param node - Program node used to locate the module diagnostic.
           */
          Program(node) {
            context.report({ messageId: "genericEvents", node });
          },
        };
      },
      meta: {
        docs: {
          description: "Require resource names in event module filenames.",
        },
        messages: {
          genericEvents:
            "Use a resource-prefixed event filename such as organization.events.ts or notification.events.ts instead of events.ts.",
        },
        schema: [],
        type: "suggestion",
      },
    },
  },
};
