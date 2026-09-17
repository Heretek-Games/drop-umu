import test from "node:test";
import assert from "node:assert/strict";
import { MockClientPluginContext, type LaunchContext } from "@droposs/plugin-sdk";
import { isWindowsGame, validateUmuLaunch } from "../src/hook.js";
import { UMU_RUN_VERSION } from "../src/embedded-umu.js";

const CAPABILITIES = [
  "ui:slot",
  "game:launch-hook",
  "system:command",
  "client:storage",
] as const;

test("isWindowsGame identifies Windows titles correctly", () => {
  const winCtx1: LaunchContext = {
    gameId: "g1",
    gameTitle: "Dark Souls",
    gameDir: "/games/darksouls",
    metadata: { targetPlatform: "windows" },
  };
  assert.equal(isWindowsGame(winCtx1), true);

  const winCtx2: LaunchContext = {
    gameId: "g2",
    gameTitle: "Skyrim",
    gameDir: "/games/skyrim",
    metadata: { launchCommand: "SkyrimSE.exe" },
  };
  assert.equal(isWindowsGame(winCtx2), true);

  const linuxCtx: LaunchContext = {
    gameId: "g3",
    gameTitle: "Celeste",
    gameDir: "/games/celeste",
    metadata: { targetPlatform: "linux", launchCommand: "./Celeste.bin.x86_64" },
  };
  assert.equal(isWindowsGame(linuxCtx), false);
});

test("validateUmuLaunch succeeds when umu-run is installed", async () => {
  const ctx = new MockClientPluginContext("drop-umu", [...CAPABILITIES]);
  ctx.systemCommand.setResponse("python3", ["--version"], {
    code: 0,
    stdout: "Python 3.14.7",
    stderr: "",
  });
  ctx.systemCommand.setResponse("umu-run", ["--version"], {
    code: 0,
    stdout: `umu-launcher version ${UMU_RUN_VERSION}`,
    stderr: "",
  });

  const launch: LaunchContext = {
    gameId: "g1",
    gameTitle: "Elden Ring",
    gameDir: "/games/eldenring",
    metadata: { targetPlatform: "windows" },
  };

  await assert.doesNotReject(() =>
    validateUmuLaunch(launch, { system: ctx.system, logger: ctx.logger }),
  );
});

test("validateUmuLaunch rejects when umu-run is missing for a Windows game", async () => {
  const ctx = new MockClientPluginContext("drop-umu", [...CAPABILITIES]);
  ctx.systemCommand.setResponse("python3", ["--version"], {
    code: 0,
    stdout: "Python 3.14.7",
    stderr: "",
  });
  ctx.systemCommand.setResponse("umu-run", ["--version"], {
    code: 1,
    stdout: "",
    stderr: "umu-run not found",
  });

  const launch: LaunchContext = {
    gameId: "g1",
    gameTitle: "Elden Ring",
    gameDir: "/games/eldenring",
    metadata: { targetPlatform: "windows" },
  };

  await assert.rejects(
    () => validateUmuLaunch(launch, { system: ctx.system, logger: ctx.logger }),
    /UMU Launcher is required to run "Elden Ring" with Proton/,
  );
});

test("validateUmuLaunch ignores native Linux games", async () => {
  const ctx = new MockClientPluginContext("drop-umu", [...CAPABILITIES]);
  // No umu-run installed
  ctx.systemCommand.setResponse("umu-run", ["--version"], {
    code: 1,
    stdout: "",
    stderr: "umu-run not found",
  });

  const launch: LaunchContext = {
    gameId: "g2",
    gameTitle: "Native Linux Game",
    gameDir: "/games/linuxgame",
    metadata: { targetPlatform: "linux", launchCommand: "./start.sh" },
  };

  await assert.doesNotReject(() =>
    validateUmuLaunch(launch, { system: ctx.system, logger: ctx.logger }),
  );
});
