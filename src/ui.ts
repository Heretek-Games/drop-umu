import type { ClientPluginContext } from "@droposs/plugin-sdk";
import {
  checkUpstreamRelease,
  detectUmu,
  installBundledUmu,
} from "./installer.js";
import type { UmuReleaseInfo, UmuStatus } from "./types.js";

interface SettingsData {
  status: UmuStatus | null;
  loading: boolean;
  installing: boolean;
  checkingUpdates: boolean;
  message: string;
  error: string;
  upstreamRelease: UmuReleaseInfo | null;
}

/**
 * Settings tab component rendered under Extension Settings in Drop.
 * Uses the Vue Options API with HTML strings to remain framework-agnostic.
 */
export function createSettingsTab(ctx: ClientPluginContext) {
  return {
    name: "UmuSettingsTab",
    data(): SettingsData {
      return {
        status: null,
        loading: true,
        installing: false,
        checkingUpdates: false,
        message: "",
        error: "",
        upstreamRelease: null,
      };
    },
    async mounted(this: SettingsData & { loadStatus: () => Promise<void> }) {
      await this.loadStatus();
    },
    methods: {
      async loadStatus(this: SettingsData) {
        this.loading = true;
        this.error = "";
        try {
          this.status = await detectUmu(ctx.system);
        } catch (err: unknown) {
          this.error = err instanceof Error ? err.message : String(err);
        } finally {
          this.loading = false;
        }
      },

      async handleInstall(this: SettingsData & { loadStatus: () => Promise<void> }) {
        this.installing = true;
        this.error = "";
        this.message = "";
        try {
          const res = await installBundledUmu(ctx.system);
          if (res.success) {
            this.message = `Successfully installed UMU Launcher (${res.version}) to ${res.path}! Restart Drop to activate Proton support.`;
            await this.loadStatus();
          } else {
            this.error = res.error || "Installation failed";
          }
        } catch (err: unknown) {
          this.error = err instanceof Error ? err.message : String(err);
        } finally {
          this.installing = false;
        }
      },

      async handleCheckUpdates(this: SettingsData) {
        this.checkingUpdates = true;
        this.error = "";
        this.message = "";
        try {
          const rel = await checkUpstreamRelease();
          if (rel) {
            this.upstreamRelease = rel;
            if (this.status?.version && this.status.version !== rel.version) {
              this.message = `New UMU version available: ${rel.version} (current: ${this.status.version})`;
            } else {
              this.message = `UMU Launcher is up to date (version ${rel.version}).`;
            }
          } else {
            this.message = "Could not reach GitHub or no releases found.";
          }
        } catch (err: unknown) {
          this.error = err instanceof Error ? err.message : String(err);
        } finally {
          this.checkingUpdates = false;
        }
      },
    },
    template: `
      <div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div class="flex items-center gap-x-2">
            <h4 class="text-sm font-semibold text-zinc-100">UMU Launcher & Proton Runner</h4>
            <span
              v-if="status && status.installed"
              class="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300 uppercase tracking-wide"
            >
              Installed (v{{ status.version || status.bundledVersion }})
            </span>
            <span
              v-else-if="status && !status.installed"
              class="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium text-amber-300 uppercase tracking-wide"
            >
              Not Installed
            </span>
          </div>

          <div class="flex items-center gap-x-2">
            <button
              type="button"
              :disabled="loading || installing || checkingUpdates"
              class="inline-flex items-center rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-50"
              @click="handleCheckUpdates"
            >
              {{ checkingUpdates ? 'Checking...' : 'Check Updates' }}
            </button>
            <button
              type="button"
              :disabled="loading || installing"
              class="inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 transition disabled:opacity-50"
              @click="handleInstall"
            >
              {{ installing ? 'Installing...' : (status && status.installed ? 'Reinstall Bundled' : 'Install UMU Launcher') }}
            </button>
          </div>
        </div>

        <p class="text-xs text-zinc-400">
          UMU (Unified Wine Launcher) is Valve's Steam Runtime container system adapted for running Windows games via Proton outside of Steam.
        </p>

        <div v-if="error" class="rounded-md bg-red-600/10 p-3 border border-red-500/20 text-xs text-red-400">
          {{ error }}
        </div>

        <div v-if="message" class="rounded-md bg-emerald-600/10 p-3 border border-emerald-500/20 text-xs text-emerald-400">
          {{ message }}
        </div>

        <div v-if="status" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div class="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/80 space-y-1">
            <span class="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">Runner Status</span>
            <p class="font-mono text-zinc-200">
              {{ status.installed ? 'Available in $PATH (' + (status.version || 'unknown') + ')' : 'Not detected in $PATH' }}
            </p>
            <p class="text-[11px] text-zinc-500">Bundled zipapp version: v{{ status.bundledVersion }}</p>
          </div>

          <div class="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/80 space-y-1">
            <span class="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">Host Environment</span>
            <p class="font-mono text-zinc-200">
              {{ status.pythonAvailable ? 'Python ' + (status.pythonVersion || '3.x') : 'Python 3 not found' }}
            </p>
            <p class="text-[11px] text-zinc-500">Target path: ~/.local/bin/umu-run</p>
          </div>
        </div>
      </div>
    `,
  };
}

/**
 * Badge component for game detail view.
 */
export function createGameBadge() {
  return {
    name: "UmuGameBadge",
    props: {
      game: { type: Object, required: false },
      status: { type: Object, required: false },
    },
    template: `
      <span
        class="inline-flex items-center gap-x-1 rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-medium text-blue-300 uppercase tracking-wide"
        title="Launches using UMU Launcher with Proton"
      >
        UMU Proton
      </span>
    `,
  };
}
