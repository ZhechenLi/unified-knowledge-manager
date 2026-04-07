import { spawnSync } from "node:child_process";
import electronPath from "electron";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "fixtures", "check-preload.cjs");
const electronMainPath = join(__dirname, "..", "electron", "main.js");
const preloadPath = join(__dirname, "..", "electron", "preload.cjs");
const shouldRunRuntimeSmoke = !process.env.CI || process.platform === "win32";

describe("electron preload bridge", () => {
  it("points the desktop shell at the CommonJS preload bridge", () => {
    const syntaxCheck = spawnSync(process.execPath, ["--check", preloadPath], {
      encoding: "utf8"
    });

    expect(syntaxCheck.status).toBe(0);
    expect(readFileSync(electronMainPath, "utf8")).toContain('join(__dirname, "preload.cjs")');
  });

  it.runIf(shouldRunRuntimeSmoke)("exposes window.ukmApi in a BrowserWindow preload", () => {
    const result = spawnSync(electronPath, [fixturePath], {
      cwd: join(__dirname, ".."),
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("UKM_API_TYPE object");
    expect(result.stdout).not.toContain("Unable to load preload script");
    expect(result.stderr).not.toContain("Unable to load preload script");
    expect(result.stderr).not.toContain("Cannot use import statement outside a module");
  });
});
