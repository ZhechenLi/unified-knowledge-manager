import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createAppContext } from "../server/create-app-context.js";
import { SetupService } from "../server/services/setup-service.js";

describe("unified knowledge backend workflow", () => {
  it("runs setup -> ingestion -> summarization -> confirmation for Codex", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "ukm-node-"));
    const homeDir = join(rootDir, "home");
    mkdirSync(homeDir, { recursive: true });

    const context = createAppContext({ rootDir, homeDir });
    const preview = context.setupService.previewSetup({
      dataSourceId: "codex",
      overwriteExistingHooks: false,
      mode: "initialize"
    });

    expect(preview.canSubmit).toBe(true);

    const initialized = context.setupService.initializeDataSource({
      dataSourceId: "codex",
      overwriteExistingHooks: true,
      mode: "initialize"
    });

    expect(initialized.status).toBe("success");

    const transcriptDir = join(initialized.resolvedCaptureOutputPath, "transcripts");
    mkdirSync(transcriptDir, { recursive: true });
    writeFileSync(
      join(transcriptDir, "codex-session-1.jsonl"),
      [
        JSON.stringify({
          type: "user_prompt",
          timestamp: "2026-04-07T12:00:00Z",
          content: "Build a local-first knowledge workflow",
          workspace_path: "/tmp/demo"
        }),
        JSON.stringify({
          type: "assistant_message",
          timestamp: "2026-04-07T12:01:00Z",
          content: "Use transcript replay for Codex ingestion."
        }),
        JSON.stringify({
          type: "tool_call",
          timestamp: "2026-04-07T12:02:00Z",
          tool_name: "functions.exec_command",
          summary_text: "Read docs and inspect logs"
        })
      ].join("\n"),
      "utf8"
    );

    const ingestion = context.ingestionService.ingestDataSource("codex");
    expect(ingestion.importedSessionIds).toEqual(["codex-session-1"]);

    const summary = context.summarizationService.createSummary({
      dataSourceId: "codex",
      sessionIds: ["codex-session-1"]
    });

    expect(summary.candidateIds).toHaveLength(1);

    const confirmed = context.reviewService.confirmCandidate(summary.candidateIds[0]);
    const cards = context.knowledgeService.searchKnowledge({
      query: "transcript",
      dataSourceId: null,
      workspacePath: null
    });

    expect(confirmed.status).toBe("confirmed");
    expect(cards).toHaveLength(1);
    expect(cards[0].title.toLowerCase()).toContain("knowledge");
  });

  it("imports Cursor conversations into normalized sessions", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "ukm-node-"));
    const homeDir = join(rootDir, "home");
    mkdirSync(homeDir, { recursive: true });

    const context = createAppContext({ rootDir, homeDir });
    const initialized = context.setupService.initializeDataSource({
      dataSourceId: "cursor",
      overwriteExistingHooks: true,
      mode: "initialize"
    });

    const sessionDir = join(initialized.resolvedCaptureOutputPath, "sessions", "cursor-session-1");
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, "conversations.json"),
      JSON.stringify(
        [
          {
            timestamp: "2026-04-07T09:00:00Z",
            workspace_path: "/tmp/shop",
            user: "Summarize recent design decisions",
            ai: "Capture the decisions in one card.",
            shell_calls: ["ls -la"],
            mcp_calls: [],
            file_reads: ["docs/prd.md"],
            edits: []
          }
        ],
        null,
        2
      ),
      "utf8"
    );

    const ingestion = context.ingestionService.ingestDataSource("cursor");
    const sessions = context.repository.listSessions({ dataSourceId: "cursor" });
    const events = context.repository.listSessionEvents("cursor-session-1");

    expect(ingestion.importedSessionIds).toEqual(["cursor-session-1"]);
    expect(sessions[0].workspacePath).toBe("/tmp/shop");
    expect(events.map((event) => event.eventType)).toEqual([
      "user_prompt",
      "assistant_message",
      "tool_call",
      "file_read"
    ]);
  });

  it("rolls back created setup files when initialization fails mid-write", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "ukm-node-"));
    const homeDir = join(rootDir, "home");
    mkdirSync(homeDir, { recursive: true });

    const context = createAppContext({ rootDir, homeDir });
    const templatesRoot = join(rootDir, "templates");
    mkdirSync(join(templatesRoot, "codex"), { recursive: true });
    writeFileSync(
      join(templatesRoot, "codex", "config.toml.tpl"),
      'capture_output_path = "__CAPTURE_OUTPUT_PATH__"\n',
      "utf8"
    );

    const service = new SetupService({
      repository: context.repository,
      homeDir,
      templatesRoot
    });

    const result = service.initializeDataSource({
      dataSourceId: "codex",
      overwriteExistingHooks: true,
      mode: "initialize"
    });

    expect(result.status).toBe("failed");
    expect(existsSync(join(homeDir, ".codex", "config.toml"))).toBe(false);
  });
});
