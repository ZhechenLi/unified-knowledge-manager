import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import viteConfig from "../vite.config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const viteCliPath = join(projectRoot, "node_modules", "vite", "bin", "vite.js");

describe("vite config", () => {
  it("uses relative asset paths for Electron file:// loads", () => {
    expect(viteConfig.base).toBe("./");
  });

  it("emits relative asset URLs in the built index.html", () => {
    const outDir = mkdtempSync(join(tmpdir(), "ukm-vite-build-"));
    const result = spawnSync(process.execPath, [viteCliPath, "build", "--outDir", outDir], {
      cwd: projectRoot,
      encoding: "utf8"
    });

    try {
      expect(result.status).toBe(0);
      const builtHtml = readFileSync(join(outDir, "index.html"), "utf8");
      expect(builtHtml).toContain('src="./assets/');
      expect(builtHtml).toContain('href="./assets/');
      expect(builtHtml).not.toContain('src="/assets/');
      expect(builtHtml).not.toContain('href="/assets/');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
