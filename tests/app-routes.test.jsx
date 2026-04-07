/* @vitest-environment jsdom */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "../src/App.jsx";

function createApiMock() {
  return {
    getDashboard: vi.fn().mockResolvedValue({
      sources: [
        { dataSourceId: "cursor", status: "ready", installedAt: "2026-04-07T09:00:00Z" },
        { dataSourceId: "codex", status: "uninitialized", installedAt: null }
      ],
      recentSessions: [
        { sessionId: "session-1", dataSourceId: "cursor", workspacePath: "/tmp/shop", lastMessageAt: "2026-04-07T09:10:00Z" }
      ],
      recentKnowledge: [
        { cardId: "card-1", title: "Codex transcript fallback", updatedAt: "2026-04-07T09:20:00Z" }
      ]
    }),
    getSourceSetupState: vi.fn().mockResolvedValue({
      dataSourceId: "codex",
      status: "uninitialized",
      resolvedInstallRoot: "/tmp/home/.codex",
      resolvedCaptureOutputPath: "/tmp/home/.codex/knowledge-capture",
      manifestPreview: {
        "config.toml": { action: "create" },
        "hooks/common.py": { action: "create" }
      },
      conflictFiles: []
    }),
    previewSetup: vi.fn().mockResolvedValue({
      canSubmit: true,
      conflictFiles: [],
      manifestPreview: {
        "config.toml": { action: "create" }
      }
    }),
    initializeSource: vi.fn().mockResolvedValue({ status: "success" }),
    syncSource: vi.fn().mockResolvedValue({
      importedSessionIds: ["session-1"]
    }),
    listSessions: vi.fn().mockResolvedValue([
      {
        sessionId: "session-1",
        title: "Local-first knowledge workflow",
        summary: "Use transcript replay for Codex",
        workspacePath: "/tmp/shop"
      }
    ]),
    summarizeSessions: vi.fn().mockResolvedValue({
      candidateIds: ["candidate-1"]
    }),
    listCandidates: vi.fn().mockResolvedValue([
      {
        candidateId: "candidate-1",
        title: "Knowledge workflow summary",
        summary: "Summarize transcript activity",
        draftContent: "Replay transcript data before creating cards.",
        status: "ready",
        conflictLevel: "none",
        sourceSessionIds: ["session-1"]
      }
    ]),
    getCandidate: vi.fn().mockResolvedValue({
      candidateId: "candidate-1",
      title: "Knowledge workflow summary",
      summary: "Summarize transcript activity",
      draftContent: "Replay transcript data before creating cards.",
      status: "ready",
      conflictLevel: "none",
      sourceSessionIds: ["session-1"],
      atomicKnowledgeCandidates: ["decision: transcript replay first"]
    }),
    confirmCandidate: vi.fn().mockResolvedValue({
      cardId: "card-1",
      status: "confirmed"
    }),
    listKnowledge: vi.fn().mockResolvedValue([
      {
        cardId: "card-1",
        title: "Codex transcript fallback",
        summary: "Hooks are not enough on their own."
      }
    ]),
    getKnowledgeCard: vi.fn().mockResolvedValue({
      cardId: "card-1",
      title: "Codex transcript fallback",
      summary: "Hooks are not enough on their own.",
      content: "Replay transcript files to reconstruct turn history.",
      tags: ["codex", "history"]
    })
  };
}

describe("react routes", () => {
  it("renders the dashboard route with source and knowledge summaries", async () => {
    const api = createApiMock();

    const view = render(<AppShell api={api} initialEntries={["/"]} />);

    await waitFor(() => expect(api.getDashboard).toHaveBeenCalled());
    expect(screen.getByRole("heading", { level: 1, name: "统一知识管理工具" })).toBeInTheDocument();
    expect(screen.getByText("cursor")).toBeInTheDocument();
    expect(screen.getByText("Codex transcript fallback")).toBeInTheDocument();
    view.unmount();
  });

  it("renders setup, review, and knowledge routes with React components", async () => {
    const api = createApiMock();

    const setupView = render(<AppShell api={api} initialEntries={["/sources/codex/setup"]} />);
    expect(await screen.findByRole("heading", { level: 1, name: "数据源初始化" })).toBeInTheDocument();
    expect(screen.getByText("/tmp/home/.codex")).toBeInTheDocument();
    setupView.unmount();

    const reviewView = render(<AppShell api={api} initialEntries={["/review/candidates/candidate-1"]} />);
    expect(await screen.findByRole("heading", { level: 1, name: "候选卡片审核" })).toBeInTheDocument();
    expect(screen.getByText("Replay transcript data before creating cards.")).toBeInTheDocument();
    reviewView.unmount();

    render(<AppShell api={api} initialEntries={["/knowledge/card-1"]} />);
    expect(await screen.findByRole("heading", { level: 1, name: "知识库" })).toBeInTheDocument();
    expect(screen.getByText("Replay transcript files to reconstruct turn history.")).toBeInTheDocument();
  });

  it("shows an explicit sync action on the sessions route", async () => {
    const api = createApiMock();

    render(<AppShell api={api} initialEntries={["/sources/codex/sessions"]} />);

    expect(await screen.findByRole("heading", { level: 1, name: "会话与汇总页" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "同步会话" })).toBeInTheDocument();
  });
});
