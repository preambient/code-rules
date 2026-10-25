#!/usr/bin/env bash
set -euo pipefail
package_root="$(pwd)"
package_tmp="$(mktemp -d)"
trap 'rm -rf "$package_tmp"' EXIT
npm pack --pack-destination "$package_tmp" --ignore-scripts > /dev/null
mkdir "$package_tmp/consumer"
cd "$package_tmp/consumer"
printf '%s\n' '{"private":true}' > package.json
bun add --exact "$package_tmp"/*.tgz
test -x node_modules/.bin/preambient-code-rules
CODE_RULES_PACKAGE_ROOT="$package_tmp/consumer/node_modules/@preambient-labs/code-rules" \
  node --test "$package_root/test/policy.test.js" "$package_root/test/spacing.test.js" "$package_root/test/import-paths.test.js" "$package_root/test/react-components.test.js"
