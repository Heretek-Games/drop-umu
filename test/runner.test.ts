import test from "node:test";
import assert from "node:assert/strict";
import {
  MockClientPluginContext,
  type LaunchContext,
} from "@droposs/plugin-sdk";
import { UMU_RUN_VERSION } from "../src/embedded-umu.js";
import {
  PROTON_PATH_KEY,
  UmuRunnerProvider,
  gameIdForUmu,
} from "../src/runner.js";

const CAPABILITIES = ["game:runner", "system:command", "client:storage"] as const;

function makeProvider() {
  const ctx = new MockClientPluginContext("drop-umu", [...CAPABILITIES]);
  const provider = new UmuRunnerProvider({
    system: ctx.system,
    storage: ctx.storage,
    logger: ctx.logger,
  });
  return { ctx, provider };
}

const WINDOWS_GAME: LaunchContext = {
  gameId: "Elden Ring",
  gameTitle: "Elden Ring",
  gameDir: "/games/eldenring",
  metadata: { targetPlatform: "windows" },
};

test("gameIdForUmu derives a stable, filesystem-safe GAMEID", () => {
  assert.equal(gameIdForUmu("Elden Ring"), "drop-elden-ring");
  assert.equal(gameIdForUmu("  "), "drop-game");
  assert.equal(gameIdForUmu("a/b:c"), "drop-a-b-c");
});

test("UmuRunnerProvider.detect reports availability and version", async () => {
  const { ctx, provider } = makeProvider();
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

  const status = await provider.detect();
  assert.equal(status.available, true);
  assert.equal(status.version, UMU_RUN_VERSION);
});

test("UmuRunnerProvider.detect reports unavailable when umu-run is missing", async () => {
  const { ctx, provider } = makeProvider();
  ctx.systemCommand.setResponse("umu-run", ["--version"], {
    code: 1,
    stdout: "",
    stderr: "not found",
  });

  const status = await provider.detect();
  assert.equal(status.available, false);
});

test("UmuRunnerProvider wraps Windows games with umu-run and a GAMEID", async () => {
  const { provider } = makeProvider();
  const overrides = await provider.resolveLaunch(WINDOWS_GAME);

  assert.equal(overrides.wrapperBin, "umu-run");
  assert.equal(overrides.environment?.GAMEID, "drop-elden-ring");
  assert.equal(overrides.environment?.PROTONPATH, undefined);
  assert.deepEqual(overrides.arguments, undefined);
});

test("UmuRunnerProvider contributes PROTONPATH when configured", async () => {
  const { ctx, provider } = makeProvider();
  await ctx.storage.set(PROTON_PATH_KEY, "/opt/proton/GE-Proton9");

  const overrides = await provider.resolveLaunch(WINDOWS_GAME);
  assert.equal(overrides.wrapperBin, "umu-run");
  assert.equal(overrides.environment?.PROTONPATH, "/opt/proton/GE-Proton9");
  assert.equal(overrides.environment?.GAMEID, "drop-elden-ring");
});

test("UmuRunnerProvider ignores native Linux games", async () => {
  const { provider } = makeProvider();
  const overrides = await provider.resolveLaunch({
    gameId: "celeste",
    gameTitle: "Celeste",
    gameDir: "/games/celeste",
    metadata: { targetPlatform: "linux", launchCommand: "./Celeste.bin.x86_64" },
  });
  assert.deepEqual(overrides, {});
});
