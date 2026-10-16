#!/usr/bin/env bash
# Installs the four packages the way a user receives them, from their npm
# tarballs into an empty project, and checks they load. The workspace links
# every package to its source tree, so a file missing from `files`, a wrong
# `exports` entry or a dropped 'use client' only shows up here.
#
# Run after `bun run build`: it packs whatever `dist` holds.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

mkdir "$work/tarballs" "$work/app"

for dir in protocol s3nd react cli; do
  (cd "$root/packages/$dir" && npm pack --silent --pack-destination "$work/tarballs" >/dev/null)
done

cd "$work/app"
npm init --yes >/dev/null
# All four at once, so the dependencies between them resolve to these
# tarballs rather than to whatever is on the registry. React is the peer
# dependency @s3nd/react expects its host to bring.
npm install --silent --no-audit --no-fund "$work"/tarballs/*.tgz react@19

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

for name in @s3nd/protocol @s3nd/core @s3nd/react; do
  node --input-type=module -e "
    const m = await import('$name')
    if (Object.keys(m).length === 0) throw new Error('no exports')
  " || fail "import('$name')"
  node --input-type=commonjs -e "
    const m = require('$name')
    if (Object.keys(m).length === 0) throw new Error('no exports')
  " || fail "require('$name')"
  echo "ok: $name loads with import and require"
done

# A Server Components build only treats the bundle as client code when the
# directive is its very first statement.
for file in dist/index.js dist/index.cjs; do
  head -c 13 "node_modules/@s3nd/react/$file" | grep -qx "'use client';" ||
    fail "@s3nd/react/$file does not start with 'use client'"
done
echo "ok: @s3nd/react starts with 'use client'"

expected=$(node -p "require('@s3nd/cli/package.json').version")
actual=$(npx --no-install s3nd --version)
[ "$actual" = "$expected" ] ||
  fail "s3nd --version printed '$actual', expected $expected"
echo "ok: s3nd --version is $expected"
