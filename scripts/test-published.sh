#!/usr/bin/env bash
set -euo pipefail
package_root="$(pwd)"
package_version="$(node -p 'require("./package.json").version')"
package_tmp="$(mktemp -d)"
trap 'rm -rf "$package_tmp"' EXIT
cd "$package_tmp"
printf '%s\n' '{"private":true}' > package.json
# A new version can take minutes to appear on the registry after `npm publish`.
published_bin=""
for attempt in $(seq 1 24); do
  if published_bin="$(npm view "@preambient-labs/code-rules@$package_version" bin.preambient-code-rules 2>/dev/null)" && test -n "$published_bin"; then
    break
  fi
  echo "Waiting for @preambient-labs/code-rules@$package_version on the registry (attempt $attempt/24)"
  sleep 15
done
test "$published_bin" = src/cli.js
bun add --exact "@preambient-labs/code-rules@$package_version"
node node_modules/.bin/preambient-code-rules init
node node_modules/.bin/preambient-code-rules verify
CODE_RULES_PACKAGE_ROOT="$package_tmp/node_modules/@preambient-labs/code-rules" \
  node --test "$package_root/test/policy.test.js" "$package_root/test/spacing.test.js" "$package_root/test/import-paths.test.js" "$package_root/test/react-components.test.js"
