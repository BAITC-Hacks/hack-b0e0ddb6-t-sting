#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
version=1.7.12
tool_dir="$(mktemp -d)"
trap 'rm -rf "$tool_dir"' EXIT

# Pin both the official installer and the binary it downloads.
curl --fail --silent --show-error --location \
  "https://raw.githubusercontent.com/rhysd/actionlint/v${version}/scripts/download-actionlint.bash" \
  --output "$tool_dir/install.bash"
bash "$tool_dir/install.bash" "$version" "$tool_dir"

# Keep workflow validation independent of optional host-installed linters.
"$tool_dir/actionlint" -color -shellcheck= -pyflakes= "$@"
