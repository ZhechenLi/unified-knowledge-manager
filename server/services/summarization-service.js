import { createId } from "../lib/ids.js";

function nowIso() {
  return new Date().toISOString();
}

function shorten(text, length = 48) {
  if (!text) {
    return "captured knowledge";
  }
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

export class SummarizationService {
  constructor({ repository }) {
    this.repository = repository;
  }

  createSummary({ dataSourceId, sessionIds }) {
    const events = sessionIds.flatMap((sessionId) => this.repository.listSessionEvents(sessionId));
    const firstPrompt = events.find((event) => event.eventType === "user_prompt")?.summaryText ?? "captured knowledge";
    const firstAssistant = events.find((event) => event.eventType === "assistant_message")?.summaryText ?? firstPrompt;
    const tools = events
      .filter((event) => ["tool_call", "mcp_call", "file_read", "file_edit"].includes(event.eventType))
      .map((event) => event.summaryText)
      .filter(Boolean);
    const workspaces = [
      ...new Set(
        sessionIds
          .map((sessionId) => this.repository.getSession(sessionId).workspacePath)
          .filter(Boolean)
      )
    ];

    const version = this.repository.getNextSummaryVersion({ dataSourceId, sessionIds });
    const candidateId = createId("candidate");
    const title = `Knowledge workflow: ${shorten(firstPrompt)}`;
    const summary = shorten(firstAssistant, 80);
    const draftContent = [
      "## Summary",
      firstAssistant,
      "",
      "## Source Sessions",
      ...sessionIds.map((sessionId) => `- ${sessionId}`),
      "",
      "## Notable Signals",
      ...tools.slice(0, 5).map((tool) => `- ${tool}`)
    ].join("\n");

    const candidate = {
      candidateId,
      sourceDataSourceIds: [dataSourceId],
      sourceWorkspacePaths: workspaces,
      sourceSessionIds: sessionIds,
      title,
      summary,
      draftContent,
      atomicKnowledgeCandidates: tools.slice(0, 3).map((tool) => `signal: ${tool}`),
      status: "ready",
      conflictLevel: this.getConflictLevel({ title, sourceSessionIds: sessionIds }),
      createdAt: nowIso()
    };

    this.repository.saveCandidate(candidate);
    this.repository.saveSummaryJob({
      summaryJobId: createId("summary-job"),
      dataSourceId,
      sessionIds,
      version,
      status: "success",
      resultCandidateIds: [candidateId],
      createdAt: nowIso(),
      finishedAt: nowIso(),
      errorMessage: null
    });

    return {
      candidateIds: [candidateId],
      version
    };
  }

  getConflictLevel({ title, sourceSessionIds }) {
    const exactMatch = this.repository
      .listKnowledgeCards()
      .find(
        (card) =>
          card.title === title &&
          card.sourceSessionIds.some((sessionId) => sourceSessionIds.includes(sessionId))
      );
    return exactMatch ? "blocking" : "none";
  }
}
