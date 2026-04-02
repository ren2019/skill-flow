#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

detect_platform() {
  case "$(uname -s)" in
    Darwin)
      echo "macos"
      ;;
    Linux)
      echo "linux"
      ;;
    MINGW*|MSYS*|CYGWIN*|Windows_NT)
      echo "windows"
      ;;
    *)
      echo "unknown"
      ;;
  esac
}

PLATFORM="${1:-$(detect_platform)}"
CLI_OUTPUT_DIR="${2:-$ROOT_DIR/dist/cli/$PLATFORM}"
DESKTOP_OUTPUT_DIR="${3:-$ROOT_DIR/dist/desktop/$PLATFORM}"

case "$PLATFORM" in
  macos|linux|windows)
    ;;
  *)
    echo "Unsupported platform: $PLATFORM" >&2
    echo "Usage: $0 [macos|linux|windows] [cli_output_dir] [desktop_output_dir]" >&2
    exit 1
    ;;
esac

"$ROOT_DIR/scripts/release/build-cli.sh" "$PLATFORM" "$CLI_OUTPUT_DIR"
npm run -w @skill-flow/desktop build
"$ROOT_DIR/scripts/release/package-desktop.sh" "$PLATFORM" "$DESKTOP_OUTPUT_DIR"
"$ROOT_DIR/scripts/release/generate-sha256.sh" "$CLI_OUTPUT_DIR"
"$ROOT_DIR/scripts/release/generate-sha256.sh" "$DESKTOP_OUTPUT_DIR"

echo "Cross-platform desktop artifacts ready for $PLATFORM"
