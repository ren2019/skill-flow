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
CLI_DIR="$ROOT_DIR/dist/cli/$PLATFORM"
DESKTOP_DIR="$ROOT_DIR/dist/desktop/$PLATFORM"
CLI_HELPER="$CLI_DIR/skill-flow-helper"

if [[ "$PLATFORM" == "windows" ]]; then
  CLI_HELPER="$CLI_DIR/skill-flow-helper.exe"
fi

if [[ ! -d "$CLI_DIR" ]]; then
  echo "Missing CLI artifact directory: $CLI_DIR" >&2
  exit 1
fi

if [[ ! -f "$CLI_HELPER" ]]; then
  echo "Missing CLI helper executable: $CLI_HELPER" >&2
  exit 1
fi

if [[ "$PLATFORM" != "windows" && ! -x "$CLI_HELPER" ]]; then
  echo "CLI helper is not executable: $CLI_HELPER" >&2
  exit 1
fi

if [[ ! -f "$CLI_DIR/sha256.txt" ]]; then
  echo "Missing CLI sha256 manifest: $CLI_DIR/sha256.txt" >&2
  exit 1
fi

if [[ ! -d "$DESKTOP_DIR" ]]; then
  echo "Missing desktop artifact directory: $DESKTOP_DIR" >&2
  exit 1
fi

if [[ ! -f "$DESKTOP_DIR/sha256.txt" ]]; then
  echo "Missing desktop sha256 manifest: $DESKTOP_DIR/sha256.txt" >&2
  exit 1
fi

if ! find "$DESKTOP_DIR" -maxdepth 1 -type f ! -name 'sha256.txt' | grep -q .; then
  echo "Missing desktop release artifacts in: $DESKTOP_DIR" >&2
  exit 1
fi

echo "Desktop release artifacts validated for $PLATFORM"
