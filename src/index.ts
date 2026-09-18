import type {
  ClientPlugin,
  ClientPluginContext,
  PluginMetadata,
} from "@droposs/plugin-sdk";
import { UMU_RUN_VERSION } from "./embedded-umu.js";
import { UmuRunnerProvider } from "./runner.js";
import { createGameBadge, createSettingsTab } from "./ui.js";

export * from "./embedded-umu.js";
export * from "./hook.js";
export * from "./installer.js";
export * from "./runner.js";
export * from "./types.js";
export * from "./ui.js";

export class DropUmuPlugin implements ClientPlugin {
  metadata: PluginMetadata = {
    id: "drop-umu",
    name: "UMU Proton Runner",
    version: "0.1.0",
    description: "Bundles and manages UMU Launcher (umu-run) for Proton game compatibility in Drop",
    author: "Heretek Games",
    apiVersion: 2,
    trust: "trusted",
    storageVersion: 1,
    category: "generic",
    targets: ["client"],
    capabilities: [
      "ui:slot",
      "game:runner",
      "system:command",
      "client:storage",
    ],
  };

  private unregisterRunner: (() => void) | undefined;

  async init(ctx: ClientPluginContext): Promise<void> {
    // 1. Register the UMU compatibility runner (host applies the overrides —
    //    no pre-launch hook or launch-command mutation).
    this.unregisterRunner = ctx.registerRunnerProvider?.(
      new UmuRunnerProvider({
        system: ctx.system,
        storage: ctx.storage,
        logger: ctx.logger,
      }),
    );

    // 2. Register settings tab under Extension Settings
    ctx.registerSlot("settings:tabs", createSettingsTab(ctx), {
      order: 20,
      label: "UMU Runner",
    });

    // 3. Register badge in game details
    ctx.registerSlot("game-detail:badges", createGameBadge(), {
      order: 15,
      label: "UMU Proton",
    });

    ctx.logger.info(`drop-umu initialized with bundled runner v${UMU_RUN_VERSION}`);
  }

  async teardown(): Promise<void> {
    this.unregisterRunner?.();
    this.unregisterRunner = undefined;
  }
}

export const dropUmuPlugin = new DropUmuPlugin();
export default dropUmuPlugin;
