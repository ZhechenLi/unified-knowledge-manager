import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";

import { createId } from "../lib/ids.js";

function nowIso() {
  return new Date().toISOString();
}

function listFiles(directory, predicate) {
  const entries = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      entries.push(...listFiles(fullPath, predicate));
    } else if (predicate(fullPath)) {
      entries.push(fullPath);
    }
  }
  return entries;
}

function mapCodexEvent(line, index) {
  const eventType = line.type ?? "system_notice";
  return {
    eventId: createId("event"),
    sequenceNo: index + 1,
    eventType,
    occurredAt: line.timestamp ?? nowIso(),
    role: eventType === "user_prompt" ? "user" : eventType === "assistant_message" ? "assistant" : null,
    summaryText: line.summary_text ?? line.content ?? line.tool_name ?? eventType,
    payload: line,
    artifactRef: null
  };
}

function normalizeCursorTurn(turn, sequenceStart) {
  const events = [];
  let cursor = sequenceStart;
  events.push({
    eventId: createId("event"),
    sequenceNo: cursor++,
    eventType: "user_prompt",
    occurredAt: turn.timestamp ?? nowIso(),
    role: "user",
    summaryText: turn.user,
    payload: { ...turn, content: turn.user },
    artifactRef: null
  });
  events.push({
    eventId: createId("event"),
    sequenceNo: cursor++,
    eventType: "assistant_message",
    occurredAt: turn.timestamp ?? nowIso(),
    role: "assistant",
    summaryText: turn.ai,
    payload: { ...turn, content: turn.ai },
    artifactRef: null
  });

  for (const shellCall of turn.shell_calls ?? []) {
    events.push({
      eventId: createId("event"),
      sequenceNo: cursor++,
      eventType: "tool_call",
      occurredAt: turn.timestamp ?? nowIso(),
      role: null,
      summaryText: shellCall,
      payload: { command: shellCall, kind: "shell" },
      artifactRef: null
    });
  }
  for (const mcpCall of turn.mcp_calls ?? []) {
    events.push({
      eventId: createId("event"),
      sequenceNo: cursor++,
      eventType: "mcp_call",
      occurredAt: turn.timestamp ?? nowIso(),
      role: null,
      summaryText: String(mcpCall),
      payload: { value: mcpCall },
      artifactRef: null
    });
  }
  for (const fileRead of turn.file_reads ?? []) {
    events.push({
      eventId: createId("event"),
      sequenceNo: cursor++,
      eventType: "file_read",
      occurredAt: turn.timestamp ?? nowIso(),
      role: null,
      summaryText: fileRead,
      payload: { path: fileRead },
      artifactRef: null
    });
  }
  for (const edit of turn.edits ?? []) {
    events.push({
      eventId: createId("event"),
      sequenceNo: cursor++,
      eventType: "file_edit",
      occurredAt: turn.timestamp ?? nowIso(),
      role: null,
      summaryText: String(edit),
      payload: { value: edit },
      artifactRef: null
    });
  }
  return events;
}

export class IngestionService {
  constructor({ repository }) {
    this.repository = repository;
  }

  ingestDataSource(dataSourceId) {
    const source = this.repository.getDataSource(dataSourceId);
    const importedSessionIds = dataSourceId === "cursor"
      ? this.ingestCursor(source)
      : this.ingestCodex(source);

    if (importedSessionIds.length > 0) {
      this.repository.saveDataSource({
        ...source,
        lastSeenAt: nowIso()
      });
    }
    return { importedSessionIds };
  }

  ingestCodex(source) {
    const transcriptRoot = join(source.captureOutputPath, "transcripts");
    try {
      return listFiles(transcriptRoot, (path) => extname(path) === ".jsonl").map((filePath) => {
        const sessionId = basename(filePath, ".jsonl");
        const lines = readFileSync(filePath, "utf8")
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line));
        const events = lines.map(mapCodexEvent);
        const startedAt = events[0]?.occurredAt ?? nowIso();
        const lastMessageAt = events[events.length - 1]?.occurredAt ?? startedAt;
        const workspacePath = lines.find((line) => line.workspace_path)?.workspace_path ?? null;
        const messageCount = events.filter((event) => ["user_prompt", "assistant_message"].includes(event.eventType)).length;
        const toolCallCount = events.filter((event) => ["tool_call", "mcp_call"].includes(event.eventType)).length;

        this.repository.saveSession({
          sessionId,
          dataSourceId: source.dataSourceId,
          client: source.clientType,
          workspacePath,
          startedAt,
          lastMessageAt,
          status: "captured",
          messageCount,
          toolCallCount,
          rawRef: filePath,
          latestSummaryJobId: null
        });
        this.repository.replaceSessionEvents({
          sessionId,
          dataSourceId: source.dataSourceId,
          events
        });
        return sessionId;
      });
    } catch {
      return [];
    }
  }

  ingestCursor(source) {
    const sessionsRoot = join(source.captureOutputPath, "sessions");
    try {
      return listFiles(sessionsRoot, (path) => basename(path) === "conversations.json").map((filePath) => {
        const sessionId = basename(dirname(filePath));
        const turns = JSON.parse(readFileSync(filePath, "utf8"));
        const workspacePath = turns.find((turn) => turn.workspace_path)?.workspace_path ?? null;
        const events = [];
        let sequenceNo = 1;
        for (const turn of turns) {
          const normalized = normalizeCursorTurn(turn, sequenceNo);
          sequenceNo += normalized.length;
          events.push(...normalized);
        }
        const startedAt = turns[0]?.timestamp ?? nowIso();
        const lastMessageAt = turns[turns.length - 1]?.timestamp ?? startedAt;
        const messageCount = turns.length * 2;
        const toolCallCount = events.filter((event) => ["tool_call", "mcp_call"].includes(event.eventType)).length;

        this.repository.saveSession({
          sessionId,
          dataSourceId: source.dataSourceId,
          client: source.clientType,
          workspacePath,
          startedAt,
          lastMessageAt,
          status: "captured",
          messageCount,
          toolCallCount,
          rawRef: filePath,
          latestSummaryJobId: null
        });
        this.repository.replaceSessionEvents({
          sessionId,
          dataSourceId: source.dataSourceId,
          events
        });
        return sessionId;
      });
    } catch {
      return [];
    }
  }
}
