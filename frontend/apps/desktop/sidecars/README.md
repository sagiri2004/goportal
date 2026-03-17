This directory is intended to hold platform-specific sidecar executables used by the Electron desktop app.

Expected layout:

- `sidecars/win/tool.exe`   - Windows sidecar binary
- `sidecars/linux/tool`     - Linux sidecar binary (ensure executable bit is set)

During packaging with electron-builder:

- On Windows, `sidecars/win/tool.exe` is copied to `resources/sidecars/tool.exe`.
- On Linux, `sidecars/linux/tool` is copied to `resources/sidecars/tool`.

Update the electron-builder configuration in `package.json` if you change names or layout.

CI notes (GitHub Actions):

- Release workflow builds desktop installers on:
  - Windows (`.msi`)
  - Linux (`.deb`)
- While no real sidecar exists yet, CI creates placeholders at:
  - `sidecars/win/tool.exe`
  - `sidecars/linux/tool`
- Replace the placeholder step with your real sidecar build (for example `go build ...`) and copy outputs to the same paths above before `electron-builder` runs.

