# Skill Flow Desktop

Minimal React + Vite renderer and Tauri 2 shell scaffold for the cross-platform desktop app.

## Scripts

- `npm run -w @skill-flow/desktop dev`
- `npm run -w @skill-flow/desktop build`
- `npm run -w @skill-flow/desktop test`
- `npm run desktop:test:cross-platform`

Import mutations refresh the desktop inventory through the shared home refresh hook, and the cross-platform CI entry also builds the renderer before running the full desktop test suite.
