#!/usr/bin/env bash
set -euo pipefail

# Installs the bundled umu-run into ~/.local/bin or a specified directory.
TARGET_DIR="${1:-$HOME/.local/bin}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE_BIN="$REPO_DIR/bin/umu-run"

echo "=== Installing Drop UMU Launcher ==="

if [[ ! -f "$SOURCE_BIN" ]]; then
  echo "Error: Bundled umu-run not found at $SOURCE_BIN." >&2
  echo "Run 'npm run fetch:upstream' to download it." >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
TARGET_BIN="$TARGET_DIR/umu-run"

cp "$SOURCE_BIN" "$TARGET_BIN"
chmod 755 "$TARGET_BIN"

echo "Successfully installed umu-run to: $TARGET_BIN"

# Check if TARGET_DIR is in PATH
if [[ ":$PATH:" != *":$TARGET_DIR:"* ]]; then
  echo ""
  echo "Notice: $TARGET_DIR is not currently in your PATH."
  echo "Add the following line to your ~/.bashrc or ~/.zshrc:"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

# Verify execution
echo ""
echo "Verifying installation:"
"$TARGET_BIN" --version
echo ""
echo "UMU Launcher is ready for use with Drop!"
