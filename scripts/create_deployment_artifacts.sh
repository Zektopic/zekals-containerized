#!/usr/bin/env bash
# Export the reviewed source, including lockfiles and documentation, without secrets.
set -euo pipefail
cd -- "$(dirname -- "$0")/.."
release_version="${1:?Usage: scripts/create_deployment_artifacts.sh <version>}"
if [[ ! "$release_version" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$ ]]; then
  printf '%s\n' 'Invalid version' >&2; exit 1
fi
mkdir -p dist
git archive --format=tar.gz --prefix="zekals-${release_version}/" -o "dist/zekals-${release_version}.tar.gz" HEAD
sha256sum "dist/zekals-${release_version}.tar.gz" > "dist/zekals-${release_version}.tar.gz.sha256"
