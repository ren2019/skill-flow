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
OUTPUT_DIR="${2:-$ROOT_DIR/dist/cli/$PLATFORM}"
HELPER_DIST_DIR="$ROOT_DIR/apps/desktop/src-tauri/gen/helper/dist"
HELPER_STAGE_DIR="$OUTPUT_DIR/helper/dist"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command npm
require_command node

case "$PLATFORM" in
  macos|linux|windows)
    ;;
  *)
    echo "Unsupported platform: $PLATFORM" >&2
    echo "Usage: $0 [macos|linux|windows] [output_dir]" >&2
    exit 1
    ;;
esac

npm run -w skill-flow build:release-helper
npm run -w @skill-flow/desktop build:helper

rm -rf "$OUTPUT_DIR"
mkdir -p "$HELPER_STAGE_DIR"
cp "$HELPER_DIST_DIR/cli.js" "$HELPER_STAGE_DIR/cli.js"
cp "$HELPER_DIST_DIR/package.json" "$HELPER_STAGE_DIR/package.json"

if [[ "$PLATFORM" == "windows" ]]; then
  require_command powershell.exe
  LAUNCHER_SOURCE="$OUTPUT_DIR/skill-flow-helper.cs"
  cat > "$LAUNCHER_SOURCE" <<'EOF'
using System;
using System.Diagnostics;
using System.IO;

internal static class Program
{
    private static int Main(string[] args)
    {
        var baseDir = AppContext.BaseDirectory;
        var helperPath = Path.Combine(baseDir, "helper", "dist", "cli.js");

        var startInfo = new ProcessStartInfo
        {
            FileName = "node",
            UseShellExecute = false,
        };
        startInfo.ArgumentList.Add(helperPath);
        foreach (var arg in args)
        {
            startInfo.ArgumentList.Add(arg);
        }

        using var process = Process.Start(startInfo);
        if (process == null)
        {
            Console.Error.WriteLine("Unable to launch node for skill-flow-helper.");
            return 1;
        }

        process.WaitForExit();
        return process.ExitCode;
    }
}
EOF

  OUTPUT_EXE="$OUTPUT_DIR/skill-flow-helper.exe"
  export OUTPUT_EXE LAUNCHER_SOURCE
  powershell.exe -NoProfile -Command '
    $compiler = (Get-Command csc.exe -ErrorAction Stop).Source
    & $compiler /nologo /target:exe /out:$env:OUTPUT_EXE $env:LAUNCHER_SOURCE
  '
  rm -f "$LAUNCHER_SOURCE"
else
  cat > "$OUTPUT_DIR/skill-flow-helper" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/helper/dist/cli.js" "$@"
EOF
  chmod +x "$OUTPUT_DIR/skill-flow-helper"
fi

echo "CLI helper artifacts ready in: $OUTPUT_DIR"
