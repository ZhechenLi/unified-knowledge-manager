import { spawnSync } from "node:child_process";
import electronPath from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "fixtures", "check-preload.cjs");

describe("electron preload bridge", () => {
  it("exposes window.ukmApi in a BrowserWindow preload", () => {
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
