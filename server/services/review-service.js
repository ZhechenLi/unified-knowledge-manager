import { createId } from "../lib/ids.js";

function nowIso() {
  return new Date().toISOString();
}

export class ReviewService {
  constructor({ repository }) {
    this.repository = repository;
  }

  saveDraft(candidateId, updates) {
    const current = this.repository.getCandidate(candidateId);
    const next = {
      ...current,
      ...updates
    };
    next.status = next.title && next.summary && next.draftContent && next.conflictLevel !== "blocking" ? "ready" : "draft";
    this.repository.saveCandidate(next);
    return next;
  }

  confirmCandidate(candidateId) {
    const candidate = this.repository.getCandidate(candidateId);
    if (candidate.status !== "ready") {
      throw new Error("Only ready candidates can be confirmed");
    }
    const cardId = createId("card");
    this.repository.saveKnowledgeCard({
      cardId,
      sourceKind: "captured",
      sourceDataSourceIds: candidate.sourceDataSourceIds,
      sourceWorkspacePaths: candidate.sourceWorkspacePaths,
      sourceSessionIds: candidate.sourceSessionIds,
      title: candidate.title,
      summary: candidate.summary,
      content: candidate.draftContent,
      tags: ["captured", ...candidate.sourceDataSourceIds],
      referenceCount: 0,
      lastReferencedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    this.repository.saveCandidate({
      ...candidate,
      status: "confirmed"
    });
    return {
      cardId,
      status: "confirmed"
    };
  }

  ignoreCandidate(candidateId) {
    const candidate = this.repository.getCandidate(candidateId);
    this.repository.saveCandidate({
      ...candidate,
      status: "ignored"
    });
    return {
      candidateId,
      status: "ignored"
    };
  }
}
