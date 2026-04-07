import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const electronMainPath = join(__dirname, "..", "electron", "main.js");

describe("electron main entry", () => {
  it("passes a syntax check", () => {
    const result = spawnSync(process.execPath, ["--check", electronMainPath], {
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });
});
