#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST_ROOT="${SKILL_FLOW_RELEASE_DIST_ROOT:-$ROOT_DIR/dist}"

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
CLI_DIR="$DIST_ROOT/cli/$PLATFORM"
DESKTOP_DIR="$DIST_ROOT/desktop/$PLATFORM"
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

require_desktop_artifact() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing desktop release artifact: $path" >&2
    exit 1
  fi
}

case "$PLATFORM" in
  macos)
    require_desktop_artifact "$DESKTOP_DIR/Skill Flow Desktop.zip"
    if ! find "$DESKTOP_DIR" -maxdepth 1 -type f -name '*.dmg' | grep -q .; then
      echo "Missing desktop release artifact: $DESKTOP_DIR/*.dmg" >&2
      exit 1
    fi
    ;;
  linux)
    if ! find "$DESKTOP_DIR" -maxdepth 1 -type f -name '*.AppImage' | grep -q .; then
      echo "Missing desktop release artifact: $DESKTOP_DIR/*.AppImage" >&2
      exit 1
    fi
    if ! find "$DESKTOP_DIR" -maxdepth 1 -type f -name '*.deb' | grep -q .; then
      echo "Missing desktop release artifact: $DESKTOP_DIR/*.deb" >&2
      exit 1
    fi
    ;;
  windows)
    if ! find "$DESKTOP_DIR" -maxdepth 1 -type f -name '*.msi' | grep -q .; then
      echo "Missing desktop release artifact: $DESKTOP_DIR/*.msi" >&2
      exit 1
    fi
    if ! find "$DESKTOP_DIR" -maxdepth 1 -type f -name '*.exe' | grep -q .; then
      echo "Missing desktop release artifact: $DESKTOP_DIR/*.exe" >&2
      exit 1
    fi
    ;;
  *)
    echo "Unsupported platform: $PLATFORM" >&2
    exit 1
    ;;
esac

echo "Desktop release artifacts validated for $PLATFORM"
