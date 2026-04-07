import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const encode = (value) => JSON.stringify(value ?? []);
const decode = (value) => (value ? JSON.parse(value) : []);

function sortSessionIds(sessionIds) {
  return [...sessionIds].sort();
}

function mapDataSource(row) {
  return {
    dataSourceId: row.data_source_id,
    clientType: row.client_type,
    status: row.status,
    installRoot: row.install_root,
    captureOutputPath: row.capture_output_path,
    installedAt: row.installed_at,
    lastSeenAt: row.last_seen_at,
    lastErrorMessage: row.last_error_message
  };
}

function mapSession(row) {
  return {
    sessionId: row.session_id,
    dataSourceId: row.data_source_id,
    client: row.client,
    workspacePath: row.workspace_path,
    startedAt: row.started_at,
    lastMessageAt: row.last_message_at,
    status: row.status,
    messageCount: row.message_count,
    toolCallCount: row.tool_call_count,
    rawRef: row.raw_ref,
    latestSummaryJobId: row.latest_summary_job_id
  };
}

function mapEvent(row) {
  return {
    eventId: row.event_id,
    sessionId: row.session_id,
    dataSourceId: row.data_source_id,
    sequenceNo: row.sequence_no,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    role: row.role,
    summaryText: row.summary_text,
    payload: JSON.parse(row.payload_json),
    artifactRef: row.artifact_ref
  };
}

function mapCandidate(row) {
  return {
    candidateId: row.candidate_id,
    sourceDataSourceIds: decode(row.source_data_source_ids_json),
    sourceWorkspacePaths: decode(row.source_workspace_paths_json),
    sourceSessionIds: decode(row.source_session_ids_json),
    title: row.title,
    summary: row.summary,
    draftContent: row.draft_content,
    atomicKnowledgeCandidates: decode(row.atomic_knowledge_candidates_json),
    status: row.status,
    conflictLevel: row.conflict_level,
    createdAt: row.created_at
  };
}

function mapKnowledgeCard(row) {
  return {
    cardId: row.card_id,
    sourceKind: row.source_kind,
    sourceDataSourceIds: decode(row.source_data_source_ids_json),
    sourceWorkspacePaths: decode(row.source_workspace_paths_json),
    sourceSessionIds: decode(row.source_session_ids_json),
    title: row.title,
    summary: row.summary,
    content: row.content,
    tags: decode(row.tags_json),
    referenceCount: row.reference_count,
    lastReferencedAt: row.last_referenced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class Repository {
  constructor(database) {
    this.database = database;
    this.db = database.db;
  }

  listDataSources() {
    return this.db.prepare(`SELECT * FROM data_sources ORDER BY data_source_id`).all().map(mapDataSource);
  }

  getDataSource(dataSourceId) {
    const row = this.db.prepare(`SELECT * FROM data_sources WHERE data_source_id = ?`).get(dataSourceId);
    if (!row) {
      throw new Error(`Unknown data source: ${dataSourceId}`);
    }
    return mapDataSource(row);
  }

  saveDataSource(dataSource) {
    this.db.prepare(
      `INSERT INTO data_sources (
        data_source_id,
        client_type,
        status,
        install_root,
        capture_output_path,
        installed_at,
        last_seen_at,
        last_error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(data_source_id) DO UPDATE SET
        client_type = excluded.client_type,
        status = excluded.status,
        install_root = excluded.install_root,
        capture_output_path = excluded.capture_output_path,
        installed_at = excluded.installed_at,
        last_seen_at = excluded.last_seen_at,
        last_error_message = excluded.last_error_message`
    ).run(
      dataSource.dataSourceId,
      dataSource.clientType,
      dataSource.status,
      dataSource.installRoot,
      dataSource.captureOutputPath,
      dataSource.installedAt ?? null,
      dataSource.lastSeenAt ?? null,
      dataSource.lastErrorMessage ?? null
    );
  }

  saveSession(session) {
    this.db.prepare(
      `INSERT INTO sessions (
        session_id,
        data_source_id,
        client,
        workspace_path,
        started_at,
        last_message_at,
        status,
        message_count,
        tool_call_count,
        raw_ref,
        latest_summary_job_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        data_source_id = excluded.data_source_id,
        client = excluded.client,
        workspace_path = excluded.workspace_path,
        started_at = excluded.started_at,
        last_message_at = excluded.last_message_at,
        status = excluded.status,
        message_count = excluded.message_count,
        tool_call_count = excluded.tool_call_count,
        raw_ref = excluded.raw_ref,
        latest_summary_job_id = excluded.latest_summary_job_id`
    ).run(
      session.sessionId,
      session.dataSourceId,
      session.client,
      session.workspacePath ?? null,
      session.startedAt,
      session.lastMessageAt,
      session.status,
      session.messageCount,
      session.toolCallCount,
      session.rawRef,
      session.latestSummaryJobId ?? null
    );
  }

  getSession(sessionId) {
    const row = this.db.prepare(`SELECT * FROM sessions WHERE session_id = ?`).get(sessionId);
    if (!row) {
      throw new Error(`Unknown session: ${sessionId}`);
    }
    return mapSession(row);
  }

  listSessions({ dataSourceId = null } = {}) {
    const rows = dataSourceId
      ? this.db
          .prepare(`SELECT * FROM sessions WHERE data_source_id = ? ORDER BY last_message_at DESC, session_id ASC`)
          .all(dataSourceId)
      : this.db.prepare(`SELECT * FROM sessions ORDER BY last_message_at DESC, session_id ASC`).all();
    return rows.map(mapSession);
  }

  replaceSessionEvents({ sessionId, dataSourceId, events }) {
    this.db.prepare(`DELETE FROM session_events WHERE session_id = ?`).run(sessionId);
    const insert = this.db.prepare(
      `INSERT INTO session_events (
        event_id,
        session_id,
        data_source_id,
        sequence_no,
        event_type,
        occurred_at,
        role,
        summary_text,
        payload_json,
        artifact_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const event of events) {
      insert.run(
        event.eventId,
        sessionId,
        dataSourceId,
        event.sequenceNo,
        event.eventType,
        event.occurredAt,
        event.role ?? null,
        event.summaryText ?? null,
        JSON.stringify(event.payload ?? {}),
        event.artifactRef ?? null
      );
    }

    const sessionEventsDir = join(this.database.eventsDir, dataSourceId, sessionId);
    mkdirSync(sessionEventsDir, { recursive: true });
    writeFileSync(
      join(sessionEventsDir, "events.jsonl"),
      events.map((event) => JSON.stringify(event)).join("\n"),
      "utf8"
    );
  }

  listSessionEvents(sessionId) {
    return this.db
      .prepare(`SELECT * FROM session_events WHERE session_id = ? ORDER BY sequence_no ASC`)
      .all(sessionId)
      .map(mapEvent);
  }

  getNextSummaryVersion({ dataSourceId, sessionIds }) {
    const sessionKey = JSON.stringify(sortSessionIds(sessionIds));
    const row = this.db
      .prepare(`SELECT MAX(version) AS max_version FROM summary_jobs WHERE data_source_id = ? AND session_key = ?`)
      .get(dataSourceId, sessionKey);
    return (row?.max_version ?? 0) + 1;
  }

  saveSummaryJob(summaryJob) {
    this.db.prepare(
      `INSERT INTO summary_jobs (
        summary_job_id,
        data_source_id,
        session_ids_json,
        session_key,
        version,
        status,
        result_candidate_ids_json,
        created_at,
        finished_at,
        error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      summaryJob.summaryJobId,
      summaryJob.dataSourceId,
      encode(summaryJob.sessionIds),
      JSON.stringify(sortSessionIds(summaryJob.sessionIds)),
      summaryJob.version,
      summaryJob.status,
      encode(summaryJob.resultCandidateIds),
      summaryJob.createdAt,
      summaryJob.finishedAt ?? null,
      summaryJob.errorMessage ?? null
    );
  }

  saveCandidate(candidate) {
    this.db.prepare(
      `INSERT INTO candidate_cards (
        candidate_id,
        source_data_source_ids_json,
        source_workspace_paths_json,
        source_session_ids_json,
        title,
        summary,
        draft_content,
        atomic_knowledge_candidates_json,
        status,
        conflict_level,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(candidate_id) DO UPDATE SET
        source_data_source_ids_json = excluded.source_data_source_ids_json,
        source_workspace_paths_json = excluded.source_workspace_paths_json,
        source_session_ids_json = excluded.source_session_ids_json,
        title = excluded.title,
        summary = excluded.summary,
        draft_content = excluded.draft_content,
        atomic_knowledge_candidates_json = excluded.atomic_knowledge_candidates_json,
        status = excluded.status,
        conflict_level = excluded.conflict_level,
        created_at = excluded.created_at`
    ).run(
      candidate.candidateId,
      encode(candidate.sourceDataSourceIds),
      encode(candidate.sourceWorkspacePaths),
      encode(candidate.sourceSessionIds),
      candidate.title,
      candidate.summary,
      candidate.draftContent,
      encode(candidate.atomicKnowledgeCandidates),
      candidate.status,
      candidate.conflictLevel,
      candidate.createdAt
    );
  }

  listCandidates() {
    return this.db
      .prepare(`SELECT * FROM candidate_cards ORDER BY created_at DESC, candidate_id ASC`)
      .all()
      .map(mapCandidate);
  }

  getCandidate(candidateId) {
    const row = this.db.prepare(`SELECT * FROM candidate_cards WHERE candidate_id = ?`).get(candidateId);
    if (!row) {
      throw new Error(`Unknown candidate: ${candidateId}`);
    }
    return mapCandidate(row);
  }

  saveKnowledgeCard(card) {
    this.db.prepare(
      `INSERT INTO knowledge_cards (
        card_id,
        source_kind,
        source_data_source_ids_json,
        source_workspace_paths_json,
        source_session_ids_json,
        title,
        summary,
        content,
        tags_json,
        reference_count,
        last_referenced_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(card_id) DO UPDATE SET
        source_kind = excluded.source_kind,
        source_data_source_ids_json = excluded.source_data_source_ids_json,
        source_workspace_paths_json = excluded.source_workspace_paths_json,
        source_session_ids_json = excluded.source_session_ids_json,
        title = excluded.title,
        summary = excluded.summary,
        content = excluded.content,
        tags_json = excluded.tags_json,
        reference_count = excluded.reference_count,
        last_referenced_at = excluded.last_referenced_at,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at`
    ).run(
      card.cardId,
      card.sourceKind,
      encode(card.sourceDataSourceIds),
      encode(card.sourceWorkspacePaths),
      encode(card.sourceSessionIds),
      card.title,
      card.summary,
      card.content,
      encode(card.tags),
      card.referenceCount,
      card.lastReferencedAt ?? null,
      card.createdAt,
      card.updatedAt
    );
  }

  listKnowledgeCards({ query = null, dataSourceId = null, workspacePath = null } = {}) {
    const clauses = [];
    const params = [];
    if (query) {
      const token = `%${query.toLowerCase()}%`;
      clauses.push(`(lower(title) LIKE ? OR lower(summary) LIKE ? OR lower(content) LIKE ?)`);
      params.push(token, token, token);
    }
    if (dataSourceId) {
      clauses.push(`source_data_source_ids_json LIKE ?`);
      params.push(`%"${dataSourceId}"%`);
    }
    if (workspacePath) {
      clauses.push(`source_workspace_paths_json LIKE ?`);
      params.push(`%"${workspacePath}"%`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT * FROM knowledge_cards ${where} ORDER BY updated_at DESC, card_id ASC`)
      .all(...params)
      .map(mapKnowledgeCard);
  }

  getKnowledgeCard(cardId) {
    const row = this.db.prepare(`SELECT * FROM knowledge_cards WHERE card_id = ?`).get(cardId);
    if (!row) {
      throw new Error(`Unknown knowledge card: ${cardId}`);
    }
    return mapKnowledgeCard(row);
  }

  getDashboard() {
    const recentSessions = this.db
      .prepare(`SELECT * FROM sessions ORDER BY last_message_at DESC, session_id ASC LIMIT 10`)
      .all()
      .map(mapSession);
    const recentKnowledge = this.db
      .prepare(`SELECT * FROM knowledge_cards ORDER BY updated_at DESC, card_id ASC LIMIT 10`)
      .all()
      .map(mapKnowledgeCard);
    return {
      sources: this.listDataSources(),
      recentSessions,
      recentKnowledge
    };
  }
}
