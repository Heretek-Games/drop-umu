import test from "node:test";
import assert from "node:assert/strict";
import { MockClientPluginContext } from "@droposs/plugin-sdk";
import { DropUmuPlugin } from "../src/index.js";

const CAPABILITIES = [
  "ui:slot",
  "game:launch-hook",
  "system:command",
  "client:storage",
] as const;

test("drop-umu registers launch hook and UI slots on init", async () => {
  const ctx = new MockClientPluginContext("drop-umu", [...CAPABILITIES]);
  const plugin = new DropUmuPlugin();

  await plugin.init(ctx);

  // Assert launch hook
  assert.equal(ctx.launchHooks.length, 1);
  assert.equal(ctx.launchHooks[0].stage, "pre-launch:validate");
  assert.equal(ctx.launchHooks[0].order, 10);

  // Assert settings slot
  const settingsSlots = ctx.registeredSlots.get("settings:tabs");
  assert.ok(settingsSlots);
  assert.equal(settingsSlots.length, 1);
  assert.equal((settingsSlots[0].component as { name?: string }).name, "UmuSettingsTab");
  assert.equal(settingsSlots[0].label, "UMU Runner");

  // Assert badges slot
  const badgeSlots = ctx.registeredSlots.get("game-detail:badges");
  assert.ok(badgeSlots);
  assert.equal(badgeSlots.length, 1);
  assert.equal((badgeSlots[0].component as { name?: string }).name, "UmuGameBadge");

  // Metadata verification
  assert.equal(plugin.metadata.id, "drop-umu");
  assert.equal(plugin.metadata.version, "0.1.0");
  assert.equal(plugin.metadata.apiVersion, 2);
  assert.deepEqual(plugin.metadata.targets, ["client"]);
});

test("drop-umu teardown executes cleanly", async () => {
  const plugin = new DropUmuPlugin();
  await plugin.teardown();
  assert.ok(true);
});
