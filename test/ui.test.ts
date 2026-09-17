import test from "node:test";
import assert from "node:assert/strict";
import { MockClientPluginContext } from "@droposs/plugin-sdk";
import { createGameBadge, createSettingsTab } from "../src/ui.js";
import { UMU_RUN_VERSION } from "../src/embedded-umu.js";

const CAPABILITIES = [
  "ui:slot",
  "game:launch-hook",
  "system:command",
  "client:storage",
] as const;

test("createSettingsTab defines the Vue options component", async () => {
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

  const tab = createSettingsTab(ctx);
  assert.equal(tab.name, "UmuSettingsTab");
  assert.match(tab.template, /UMU Launcher & Proton Runner/);
  assert.match(tab.template, /handleInstall/);
  assert.match(tab.template, /handleCheckUpdates/);

  // Test component lifecycle data & methods
  const state = tab.data();
  assert.equal(state.loading, true);
  assert.equal(state.installing, false);

  const instance = {
    ...state,
    ...tab.methods,
  };

  await instance.loadStatus();
  assert.equal(instance.loading, false);
  assert.equal(instance.status?.installed, true);
  assert.equal(instance.status?.version, UMU_RUN_VERSION);
});

test("createGameBadge returns expected badge markup", () => {
  const badge = createGameBadge();
  assert.equal(badge.name, "UmuGameBadge");
  assert.match(badge.template, /UMU Proton/);
});
