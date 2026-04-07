import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS data_sources (
    data_source_id TEXT PRIMARY KEY,
    client_type TEXT NOT NULL,
    status TEXT NOT NULL,
    install_root TEXT NOT NULL,
    capture_output_path TEXT NOT NULL,
    installed_at TEXT,
    last_seen_at TEXT,
    last_error_message TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    data_source_id TEXT NOT NULL,
    client TEXT NOT NULL,
    workspace_path TEXT,
    started_at TEXT NOT NULL,
    last_message_at TEXT NOT NULL,
    status TEXT NOT NULL,
    message_count INTEGER NOT NULL,
    tool_call_count INTEGER NOT NULL,
    raw_ref TEXT NOT NULL,
    latest_summary_job_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS session_events (
    event_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    data_source_id TEXT NOT NULL,
    sequence_no INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    role TEXT,
    summary_text TEXT,
    payload_json TEXT NOT NULL,
    artifact_ref TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS summary_jobs (
    summary_job_id TEXT PRIMARY KEY,
    data_source_id TEXT NOT NULL,
    session_ids_json TEXT NOT NULL,
    session_key TEXT NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL,
    result_candidate_ids_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    finished_at TEXT,
    error_message TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS candidate_cards (
    candidate_id TEXT PRIMARY KEY,
    source_data_source_ids_json TEXT NOT NULL,
    source_workspace_paths_json TEXT NOT NULL,
    source_session_ids_json TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    draft_content TEXT NOT NULL,
    atomic_knowledge_candidates_json TEXT NOT NULL,
    status TEXT NOT NULL,
    conflict_level TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS knowledge_cards (
    card_id TEXT PRIMARY KEY,
    source_kind TEXT NOT NULL,
    source_data_source_ids_json TEXT NOT NULL,
    source_workspace_paths_json TEXT NOT NULL,
    source_session_ids_json TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    reference_count INTEGER NOT NULL,
    last_referenced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`
];

export function createDatabase({ dataDir }) {
  mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, "knowledge.db");
  const eventsDir = join(dataDir, "sessions");
  mkdirSync(eventsDir, { recursive: true });

  const db = new DatabaseSync(dbPath);
  for (const statement of SCHEMA) {
    db.exec(statement);
  }

  const seed = db.prepare(
    `INSERT OR IGNORE INTO data_sources (
      data_source_id,
      client_type,
      status,
      install_root,
      capture_output_path,
      installed_at,
      last_seen_at,
      last_error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  seed.run("cursor", "cursor", "uninitialized", "~/.cursor", "~/.cursor/knowledge-capture", null, null, null);
  seed.run("codex", "codex", "uninitialized", "~/.codex", "~/.codex/knowledge-capture", null, null, null);

  return { db, dbPath, dataDir, eventsDir };
}
