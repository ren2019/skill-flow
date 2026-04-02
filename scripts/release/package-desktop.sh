#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUNDLE_ROOT="$ROOT_DIR/apps/desktop/src-tauri/target/release/bundle"

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
OUTPUT_DIR="${2:-$ROOT_DIR/dist/desktop/$PLATFORM}"

copy_if_present() {
  local source_path="$1"
  if [[ -e "$source_path" ]]; then
    cp -R "$source_path" "$OUTPUT_DIR/"
  fi
}

copy_matches() {
  local search_root="$1"
  local glob_pattern="$2"
  if [[ ! -d "$search_root" ]]; then
    return
  fi

  find "$search_root" -maxdepth 1 -type f -name "$glob_pattern" -exec cp {} "$OUTPUT_DIR/" \;
}

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

case "$PLATFORM" in
  macos)
    if [[ ! -d "$BUNDLE_ROOT/macos" ]]; then
      echo "Missing macOS bundle directory: $BUNDLE_ROOT/macos" >&2
      exit 1
    fi
    APP_BUNDLE="$(find "$BUNDLE_ROOT/macos" -maxdepth 1 -type d -name '*.app' | head -n 1)"
    if [[ -z "$APP_BUNDLE" ]]; then
      echo "Missing macOS app bundle in: $BUNDLE_ROOT/macos" >&2
      exit 1
    fi
    if ! command -v ditto >/dev/null 2>&1; then
      echo "Missing required command: ditto" >&2
      exit 1
    fi
    ditto -c -k --sequesterRsrc --keepParent "$APP_BUNDLE" \
      "$OUTPUT_DIR/$(basename "${APP_BUNDLE%.app}").zip"
    copy_matches "$BUNDLE_ROOT/dmg" "*.dmg"
    ;;
  linux)
    copy_matches "$BUNDLE_ROOT/appimage" "*.AppImage"
    copy_matches "$BUNDLE_ROOT/deb" "*.deb"
    copy_matches "$BUNDLE_ROOT/rpm" "*.rpm"
    ;;
  windows)
    copy_matches "$BUNDLE_ROOT/nsis" "*.exe"
    copy_matches "$BUNDLE_ROOT/msi" "*.msi"
    ;;
  *)
    echo "Unsupported platform: $PLATFORM" >&2
    echo "Usage: $0 [macos|linux|windows] [output_dir]" >&2
    exit 1
    ;;
esac

if ! find "$OUTPUT_DIR" -maxdepth 1 -type f | grep -q .; then
  echo "No packaged desktop artifacts found for $PLATFORM." >&2
  exit 1
fi

echo "Desktop package artifacts ready in: $OUTPUT_DIR"
