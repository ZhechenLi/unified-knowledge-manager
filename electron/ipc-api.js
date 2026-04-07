export const IPC_CHANNELS = {
  getDashboard: "ukm:get-dashboard",
  getSourceSetupState: "ukm:get-source-setup-state",
  previewSetup: "ukm:preview-setup",
  initializeSource: "ukm:initialize-source",
  syncSource: "ukm:sync-source",
  listSessions: "ukm:list-sessions",
  summarizeSessions: "ukm:summarize-sessions",
  listCandidates: "ukm:list-candidates",
  getCandidate: "ukm:get-candidate",
  confirmCandidate: "ukm:confirm-candidate",
  listKnowledge: "ukm:list-knowledge",
  getKnowledgeCard: "ukm:get-knowledge-card"
};

export function buildElectronApi(invoke) {
  return {
    getDashboard: () => invoke(IPC_CHANNELS.getDashboard),
    getSourceSetupState: (dataSourceId) => invoke(IPC_CHANNELS.getSourceSetupState, { dataSourceId }),
    previewSetup: (dataSourceId, payload) => invoke(IPC_CHANNELS.previewSetup, { dataSourceId, ...payload }),
    initializeSource: (dataSourceId, payload) =>
      invoke(IPC_CHANNELS.initializeSource, { dataSourceId, ...payload }),
    syncSource: (dataSourceId) => invoke(IPC_CHANNELS.syncSource, { dataSourceId }),
    listSessions: (dataSourceId) => invoke(IPC_CHANNELS.listSessions, { dataSourceId }),
    summarizeSessions: (payload) => invoke(IPC_CHANNELS.summarizeSessions, payload),
    listCandidates: () => invoke(IPC_CHANNELS.listCandidates),
    getCandidate: (candidateId) => invoke(IPC_CHANNELS.getCandidate, { candidateId }),
    confirmCandidate: (candidateId) => invoke(IPC_CHANNELS.confirmCandidate, { candidateId }),
    listKnowledge: (payload = {}) => invoke(IPC_CHANNELS.listKnowledge, payload),
    getKnowledgeCard: (cardId) => invoke(IPC_CHANNELS.getKnowledgeCard, { cardId })
  };
}
