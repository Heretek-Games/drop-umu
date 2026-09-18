import type { ClientPluginSystem } from "@droposs/plugin-sdk";
import { UMU_RUN_BASE64, UMU_RUN_SHA256, UMU_RUN_VERSION } from "./embedded-umu.js";
import type { InstallOptions, InstallResult, UmuReleaseInfo, UmuStatus } from "./types.js";

export const DEFAULT_INSTALL_PATH = "~/.local/bin/umu-run";

/**
 * Extracts semver version from umu-run --version output.
 * Example output: "umu-launcher version 1.4.4 (3.14.7 ...)"
 */
export function parseUmuVersion(output: string): string | undefined {
  const match = output.match(/version\s+([0-9]+\.[0-9]+\.[0-9]+)/i);
  return match ? match[1] : undefined;
}

/**
 * Extracts Python version from python3 --version output.
 * Example output: "Python 3.14.7"
 */
export function parsePythonVersion(output: string): string | undefined {
  const match = output.match(/Python\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i);
  return match ? match[1] : undefined;
}

/**
 * Verifies if Python 3 is available on the host system.
 */
export async function checkPython(
  system: ClientPluginSystem,
): Promise<{ available: boolean; version?: string }> {
  try {
    const res = await system.run("python3", ["--version"]);
    if (res.code === 0) {
      return {
        available: true,
        version: parsePythonVersion(res.stdout || res.stderr),
      };
    }
    return { available: false };
  } catch {
    return { available: false };
  }
}

/**
 * Detects whether umu-run is currently available and runnable.
 */
export async function detectUmu(system: ClientPluginSystem): Promise<UmuStatus> {
  const pythonStatus = await checkPython(system);

  try {
    const res = await system.run("umu-run", ["--version"]);
    if (res.code === 0) {
      const version = parseUmuVersion(res.stdout || res.stderr);
      return {
        installed: true,
        version,
        path: "umu-run",
        isBundledVersion: version === UMU_RUN_VERSION,
        bundledVersion: UMU_RUN_VERSION,
        pythonAvailable: pythonStatus.available,
        pythonVersion: pythonStatus.version,
      };
    }
  } catch {
    // Non-zero exit or not allowlisted/not in PATH
  }

  return {
    installed: false,
    bundledVersion: UMU_RUN_VERSION,
    isBundledVersion: false,
    pythonAvailable: pythonStatus.available,
    pythonVersion: pythonStatus.version,
  };
}

/**
 * Installs the bundled umu-run standalone zipapp into target directory (~/.local/bin/umu-run by default).
 */
export async function installBundledUmu(
  system: ClientPluginSystem,
  options?: InstallOptions,
): Promise<InstallResult> {
  const targetPath = options?.targetPath || DEFAULT_INSTALL_PATH;
  const force = options?.force ? "1" : "0";

  // Split base64 payload into chunks below Linux MAX_ARG_STRLEN (131072)
  const CHUNK_SIZE = 60_000;
  const chunks: string[] = [];
  for (let i = 0; i < UMU_RUN_BASE64.length; i += CHUNK_SIZE) {
    chunks.push(UMU_RUN_BASE64.slice(i, i + CHUNK_SIZE));
  }

  // Python staging script with sha256 check, force flag support, and chunked args
  const pythonScript = [
    "import base64, hashlib, os, sys",
    "target = os.path.expanduser(sys.argv[1])",
    "force = sys.argv[2] == '1'",
    "expected_sha256 = sys.argv[3]",
    "if os.path.exists(target) and not force:",
    "    print(f'EXISTS:{target}')",
    "    sys.exit(0)",
    "data_b64 = ''.join(sys.argv[4:])",
    "if not data_b64 and not sys.stdin.isatty():",
    "    data_b64 = sys.stdin.read().strip()",
    "data = base64.b64decode(data_b64)",
    "digest = hashlib.sha256(data).hexdigest()",
    "if digest.lower() != expected_sha256.lower():",
    "    print(f'SHA256_MISMATCH: expected {expected_sha256}, got {digest}', file=sys.stderr)",
    "    sys.exit(2)",
    "os.makedirs(os.path.dirname(target), exist_ok=True)",
    "with open(target, 'wb') as f:",
    "    f.write(data)",
    "os.chmod(target, 0o755)",
    "print(f'SUCCESS:{target}')",
  ].join("; ");

  try {
    const res = await system.run("python3", [
      "-c",
      pythonScript,
      targetPath,
      force,
      UMU_RUN_SHA256,
      ...chunks,
    ]);

    if (res.code !== 0) {
      return {
        success: false,
        path: targetPath,
        version: UMU_RUN_VERSION,
        error: res.stderr.trim() || res.stdout.trim() || `Command failed with code ${res.code}`,
      };
    }

    return {
      success: true,
      path: targetPath,
      version: UMU_RUN_VERSION,
    };
  } catch (err: unknown) {
    return {
      success: false,
      path: targetPath,
      version: UMU_RUN_VERSION,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Checks for newer releases on the official Open-Wine-Components/umu-launcher GitHub repo.
 */
export async function checkUpstreamRelease(
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<UmuReleaseInfo | null> {
  try {
    const res = await fetchFn(
      "https://api.github.com/repos/Open-Wine-Components/umu-launcher/releases/latest",
      {
        headers: {
          "User-Agent": "Heretek-Drop-UMU",
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!res.ok) return null;

    const data = (await res.json()) as {
      tag_name: string;
      published_at: string;
      assets?: Array<{ name: string; browser_download_url: string; digest?: string }>;
    };

    const asset = data.assets?.find(
      (a) => a.name.startsWith("umu-launcher-") && a.name.endsWith("-zipapp.tar"),
    );

    if (!asset) return null;

    return {
      version: data.tag_name,
      downloadUrl: asset.browser_download_url,
      sha256: asset.digest ? asset.digest.replace(/^sha256:/, "") : "",
      publishedAt: data.published_at,
    };
  } catch {
    return null;
  }
}
