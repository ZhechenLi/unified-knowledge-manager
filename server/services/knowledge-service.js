import { createId } from "../lib/ids.js";

function nowIso() {
  return new Date().toISOString();
}

export class KnowledgeService {
  constructor({ repository }) {
    this.repository = repository;
  }

  searchKnowledge({ query = null, dataSourceId = null, workspacePath = null } = {}) {
    return this.repository.listKnowledgeCards({ query, dataSourceId, workspacePath });
  }

  getKnowledgeCard(cardId) {
    return this.repository.getKnowledgeCard(cardId);
  }

  createManualCard({ title, summary, content, tags = [] }) {
    const cardId = createId("card");
    this.repository.saveKnowledgeCard({
      cardId,
      sourceKind: "manual",
      sourceDataSourceIds: [],
      sourceWorkspacePaths: [],
      sourceSessionIds: [],
      title,
      summary,
      content,
      tags,
      referenceCount: 0,
      lastReferencedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    return this.repository.getKnowledgeCard(cardId);
  }
}
