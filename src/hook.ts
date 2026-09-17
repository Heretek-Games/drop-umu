import type { ClientPluginSystem, LaunchContext, PluginLogger } from "@droposs/plugin-sdk";
import { detectUmu } from "./installer.js";

export interface ValidateDeps {
  system: ClientPluginSystem;
  logger: PluginLogger;
}

/**
 * Checks whether the target game is a Windows game (executable ends in .exe or targetPlatform is windows).
 */
export function isWindowsGame(context: LaunchContext): boolean {
  const targetPlatform = String(context.metadata?.targetPlatform || "").toLowerCase();
  if (targetPlatform === "windows" || targetPlatform === "win32" || targetPlatform === "win64") {
    return true;
  }

  const launchCommand = String(context.metadata?.launchCommand || "").toLowerCase();
  if (launchCommand.includes(".exe")) {
    return true;
  }

  return false;
}

/**
 * Pre-launch validation hook. Fails closed if a Windows game requires UMU/Proton but umu-run is not installed.
 */
export async function validateUmuLaunch(
  context: LaunchContext,
  deps: ValidateDeps,
): Promise<void> {
  // If the game does not appear to be a Windows game, don't gate it
  if (!isWindowsGame(context)) {
    return;
  }

  deps.logger.debug(`Validating UMU runner for Windows game: ${context.gameTitle}`);
  const status = await detectUmu(deps.system);

  if (!status.installed) {
    const message = `UMU Launcher is required to run "${context.gameTitle}" with Proton, but was not found in $PATH. Please open Drop Settings -> Extension Settings -> UMU Launcher to install it with one click.`;
    deps.logger.error(message);
    throw new Error(message);
  }

  deps.logger.info(`UMU runner verified (${status.version || "available"}) for ${context.gameTitle}`);
}
