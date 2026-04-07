import { describe, expect, it, vi } from "vitest";

import { createAppApi } from "../src/api/client.js";
import { buildElectronApi, IPC_CHANNELS } from "../electron/ipc-api.js";
import { buildMainApi } from "../electron/main-api.js";
import { createAppContext } from "../server/create-app-context.js";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("electron bridge api", () => {
  it("builds IPC-backed electron calls", async () => {
    const invoke = vi.fn(async () => ({ ok: true }));
    const api = buildElectronApi(invoke);

    await api.getDashboard();
    await api.confirmCandidate("candidate-1");

    expect(invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.getDashboard);
    expect(invoke).toHaveBeenNthCalledWith(2, IPC_CHANNELS.confirmCandidate, {
      candidateId: "candidate-1"
    });
  });

  it("prefers window.ukmApi when available", () => {
    const originalWindow = globalThis.window;
    globalThis.window = {
      ukmApi: {
        getDashboard: vi.fn()
      }
    };

    const api = createAppApi();

    expect(api).toBe(globalThis.window.ukmApi);
    globalThis.window = originalWindow;
  });

  it("exposes syncSource through the electron main api", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "ukm-electron-"));
    const homeDir = join(rootDir, "home");
    mkdirSync(homeDir, { recursive: true });

    const context = createAppContext({ rootDir, homeDir });
    const initialized = context.setupService.initializeDataSource({
      dataSourceId: "codex",
      overwriteExistingHooks: true,
      mode: "initialize"
    });
    const transcriptDir = join(initialized.resolvedCaptureOutputPath, "transcripts");
    mkdirSync(transcriptDir, { recursive: true });
    writeFileSync(
      join(transcriptDir, "sync-session.jsonl"),
      `${JSON.stringify({
        type: "user_prompt",
        timestamp: "2026-04-07T12:00:00Z",
        content: "sync me"
      })}\n`,
      "utf8"
    );

    const mainApi = buildMainApi(context);
    const result = mainApi[IPC_CHANNELS.syncSource]({ dataSourceId: "codex" });

    expect(result.importedSessionIds).toEqual(["sync-session"]);
    expect(context.repository.listSessions({ dataSourceId: "codex" })).toHaveLength(1);
  });
});
