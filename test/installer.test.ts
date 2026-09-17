import test from "node:test";
import assert from "node:assert/strict";
import { MockClientPluginContext } from "@droposs/plugin-sdk";
import {
  checkPython,
  checkUpstreamRelease,
  detectUmu,
  installBundledUmu,
  parsePythonVersion,
  parseUmuVersion,
} from "../src/installer.js";
import { UMU_RUN_VERSION } from "../src/embedded-umu.js";

const CAPABILITIES = [
  "ui:slot",
  "game:launch-hook",
  "system:command",
  "client:storage",
] as const;

test("parseUmuVersion parses version string correctly", () => {
  assert.equal(
    parseUmuVersion("umu-launcher version 1.4.4 (3.14.7 (main) [GCC 13.3.0])"),
    "1.4.4",
  );
  assert.equal(parseUmuVersion("umu version 1.2.0"), "1.2.0");
  assert.equal(parseUmuVersion("random text without version"), undefined);
});

test("parsePythonVersion parses Python output correctly", () => {
  assert.equal(parsePythonVersion("Python 3.14.7\n"), "3.14.7");
  assert.equal(parsePythonVersion("Python 3.11.2"), "3.11.2");
  assert.equal(parsePythonVersion("not python"), undefined);
});

test("checkPython reports python availability", async () => {
  const ctx = new MockClientPluginContext("drop-umu", [...CAPABILITIES]);
  ctx.systemCommand.setResponse("python3", ["--version"], {
    code: 0,
    stdout: "Python 3.14.7\n",
    stderr: "",
  });

  const res = await checkPython(ctx.system);
  assert.equal(res.available, true);
  assert.equal(res.version, "3.14.7");

  // When python is not available
  ctx.systemCommand.setResponse("python3", ["--version"], {
    code: 127,
    stdout: "",
    stderr: "command not found",
  });

  const resNotFound = await checkPython(ctx.system);
  assert.equal(resNotFound.available, false);
});

test("detectUmu returns installed state when umu-run is present", async () => {
  const ctx = new MockClientPluginContext("drop-umu", [...CAPABILITIES]);
  ctx.systemCommand.setResponse("python3", ["--version"], {
    code: 0,
    stdout: "Python 3.14.7\n",
    stderr: "",
  });
  ctx.systemCommand.setResponse("umu-run", ["--version"], {
    code: 0,
    stdout: `umu-launcher version ${UMU_RUN_VERSION} (3.14.7)\n`,
    stderr: "",
  });

  const status = await detectUmu(ctx.system);
  assert.equal(status.installed, true);
  assert.equal(status.version, UMU_RUN_VERSION);
  assert.equal(status.isBundledVersion, true);
  assert.equal(status.pythonAvailable, true);
});

test("detectUmu returns uninstalled when umu-run fails or is missing", async () => {
  const ctx = new MockClientPluginContext("drop-umu", [...CAPABILITIES]);
  ctx.systemCommand.setResponse("python3", ["--version"], {
    code: 0,
    stdout: "Python 3.14.7\n",
    stderr: "",
  });
  ctx.systemCommand.setResponse("umu-run", ["--version"], {
    code: 1,
    stdout: "",
    stderr: "command not allowlisted or not found",
  });

  const status = await detectUmu(ctx.system);
  assert.equal(status.installed, false);
  assert.equal(status.bundledVersion, UMU_RUN_VERSION);
  assert.equal(status.pythonAvailable, true);
});

test("installBundledUmu executes python staging script", async () => {
  const ctx = new MockClientPluginContext("drop-umu", [...CAPABILITIES]);
  ctx.systemCommand.fallback = {
    code: 0,
    stdout: "SUCCESS:~/.local/bin/umu-run\n",
    stderr: "",
  };

  const result = await installBundledUmu(ctx.system);
  assert.equal(result.success, true);
  assert.equal(result.version, UMU_RUN_VERSION);
  assert.equal(result.path, "~/.local/bin/umu-run");
  assert.equal(ctx.systemCommand.calls.length, 1);
  assert.equal(ctx.systemCommand.calls[0].bin, "python3");
});

test("checkUpstreamRelease fetches release info using mock fetch", async () => {
  const mockFetch = async () =>
    new Response(
      JSON.stringify({
        tag_name: "1.4.5",
        published_at: "2026-08-01T00:00:00Z",
        assets: [
          {
            name: "umu-launcher-1.4.5-zipapp.tar",
            browser_download_url: "https://github.com/mock/umu-launcher-1.4.5-zipapp.tar",
            digest: "sha256:abcd1234abcd",
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const release = await checkUpstreamRelease(mockFetch as unknown as typeof fetch);
  assert.ok(release);
  assert.equal(release?.version, "1.4.5");
  assert.equal(release?.sha256, "abcd1234abcd");
});
