# Skill Flow Desktop

Minimal React + Vite renderer and Tauri 2 shell scaffold for the cross-platform desktop app.

## Scripts

- `npm run -w @skill-flow/desktop dev`
- `npm run -w @skill-flow/desktop build`
- `npm run -w @skill-flow/desktop test`
- `npm run desktop:test:cross-platform`
- `npm run desktop:release`
- `npm run desktop:release:validate`

Import mutations refresh the desktop inventory through the shared home refresh hook, and the cross-platform CI entry also builds the renderer before running the full desktop test suite.

## Linux prerequisites

Ubuntu/Debian:

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

## Release artifacts

Cross-platform release scripts write:

- `dist/cli/{macos,linux,windows}`
- `dist/desktop/{macos,linux,windows}`

Each platform directory includes a `sha256.txt` manifest generated from the packaged artifacts.
