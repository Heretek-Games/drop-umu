# drop-umu

> UMU Launcher (`umu-run`) manager and bundled Proton compatibility runner for [Drop](https://github.com/Drop-OSS/drop).

`drop-umu` is an official Heretek Games plugin that bundles and automates the installation and lifecycle management of [umu-launcher](https://github.com/Open-Wine-Components/umu-launcher).

---

## Features

- 📦 **Bundled Standalone Runner**: Includes the upstream `umu-run` Python zipapp (~419 KB) containing all internal dependencies for zero-compilation execution.
- ⚡ **One-Click User-Space Installation**: Deploys `umu-run` to `~/.local/bin/umu-run` with `0o755` permissions without requiring root or sudo privileges.
- 🖥️ **Drop Settings Integration**: Contributes an **UMU Runner** management card directly under Drop's Extension Settings (`settings:tabs`), showing detection state, Python environment details, and an install/reinstall button.
- 🛡️ **Pre-Launch Validation**: Provides a `pre-launch:validate` hook to ensure `umu-run` is ready in `$PATH` before Windows titles launch with Proton, avoiding cryptic process errors.
- 🔄 **Update Checker**: Verifies against the official GitHub releases API to identify and download new versions.

---

## Installation & Development

### Prerequisites

- Node.js 22+
- Python 3.10+ (for running `umu-run`)

### Setup

```bash
git clone https://github.com/Heretek-Games/drop-umu.git
cd drop-umu
npm ci
```

### Build & Test

```bash
npm run build       # Compile TypeScript and sign manifest
npm test            # Run unit tests
npm run typecheck   # Check TypeScript types
npm run lint        # Lint sources
npm run pack        # Package into .dropplugin archive
```

### Manual Installation via CLI

You can install the bundled runner directly from your terminal:

```bash
npm run install:umu
# or:
bash scripts/install-umu.sh
```

---

## Architecture

- **Manifest**: `drop-plugin.json` (universal Drop Plugin API v2)
- **Targets**: `["client"]`
- **Capabilities**:
  - `ui:slot`: Injects settings tab (`settings:tabs`) and game badges (`game-detail:badges`).
  - `system:command`: Allows invoking `umu-run` and `python3`.
  - `game:launch-hook`: Pre-launch validation gate for Proton games.
  - `client:storage`: Persists runner settings and status.

---

## License

MIT © Heretek Games
