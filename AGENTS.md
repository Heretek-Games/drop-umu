# AGENTS.md — drop-umu

UMU Launcher (`umu-run`) manager and bundled Proton compatibility runner for Drop.

## Purpose & Scope

This repository provides a self-contained Drop desktop plugin that bundles, installs, and manages [umu-launcher](https://github.com/Open-Wine-Components/umu-launcher) (`umu-run`). It enables one-click installation into `~/.local/bin/umu-run` and provides pre-launch validation for Windows games running under Proton.

## Commands

```sh
npm ci
npm run build
npm test
npm run typecheck
npm run lint
npm run pack
```

Built on `@droposs/plugin-sdk` (plugin API v2), resolved from npm registry (`^0.6.1`).
Controlled by `.sdk-scope.json` and `scripts/switch-sdk-scope.mjs`.
