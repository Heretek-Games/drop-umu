import type {
  ClientPluginStorage,
  ClientPluginSystem,
  LaunchContext,
  LaunchOverrides,
  PluginLogger,
  RunnerPlatform,
  RunnerProvider,
} from "@droposs/plugin-sdk";
import { detectUmu } from "./installer.js";
import { isWindowsGame } from "./hook.js";

export interface UmuRunnerDeps {
  system: ClientPluginSystem;
  storage: ClientPluginStorage;
  logger: PluginLogger;
}

/** Storage key for the optional Proton build directory (`PROTONPATH`). */
export const PROTON_PATH_KEY = "proton_path";

/**
 * Derives a stable, filesystem-safe `GAMEID` for a Drop game id. UMU uses it to
 * name the Proton prefix, so the same game always resolves to the same prefix.
 */
export function gameIdForUmu(gameId: string): string {
  const sanitized = gameId
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "");
  return `drop-${sanitized || "game"}`.slice(0, 64);
}

/**
 * Compatibility runner that launches Windows titles through UMU/Proton.
 *
 * Availability is reported by `detect()`; the host skips the provider when UMU
 * is not installed, so no pre-launch hook or core launch-command mutation is
 * involved. `resolveLaunch()` wraps the resolved command with `umu-run` and
 * supplies `PROTONPATH` (when configured) and a stable `GAMEID`.
 */
export class UmuRunnerProvider implements RunnerProvider {
  id = "drop-umu";
  name = "UMU Proton Runner";
  supportedPlatforms: RunnerPlatform[] = ["linux"];

  constructor(private readonly deps: UmuRunnerDeps) {}

  async detect(): Promise<{ available: boolean; version?: string }> {
    const status = await detectUmu(this.deps.system);
    return {
      available: status.installed,
      version: status.version ?? status.bundledVersion,
    };
  }

  async resolveLaunch(context: LaunchContext): Promise<LaunchOverrides> {
    if (!isWindowsGame(context)) return {};

    const environment: Record<string, string> = {
      GAMEID: gameIdForUmu(context.gameId),
    };

    const protonPath = await this.deps.storage.get<string>(PROTON_PATH_KEY);
    if (protonPath) environment.PROTONPATH = protonPath;

    this.deps.logger.debug(
      `Launching '${context.gameTitle}' through UMU (${environment.GAMEID})`,
    );

    return { wrapperBin: "umu-run", environment };
  }
}
