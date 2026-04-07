const { contextBridge, ipcRenderer } = require("electron");

const IPC_CHANNELS = {
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

contextBridge.exposeInMainWorld("ukmApi", {
  getDashboard: () => ipcRenderer.invoke(IPC_CHANNELS.getDashboard),
  getSourceSetupState: (dataSourceId) =>
    ipcRenderer.invoke(IPC_CHANNELS.getSourceSetupState, { dataSourceId }),
  previewSetup: (dataSourceId, payload) =>
    ipcRenderer.invoke(IPC_CHANNELS.previewSetup, { dataSourceId, ...payload }),
  initializeSource: (dataSourceId, payload) =>
    ipcRenderer.invoke(IPC_CHANNELS.initializeSource, { dataSourceId, ...payload }),
  syncSource: (dataSourceId) => ipcRenderer.invoke(IPC_CHANNELS.syncSource, { dataSourceId }),
  listSessions: (dataSourceId) => ipcRenderer.invoke(IPC_CHANNELS.listSessions, { dataSourceId }),
  summarizeSessions: (payload) => ipcRenderer.invoke(IPC_CHANNELS.summarizeSessions, payload),
  listCandidates: () => ipcRenderer.invoke(IPC_CHANNELS.listCandidates),
  getCandidate: (candidateId) => ipcRenderer.invoke(IPC_CHANNELS.getCandidate, { candidateId }),
  confirmCandidate: (candidateId) => ipcRenderer.invoke(IPC_CHANNELS.confirmCandidate, { candidateId }),
  listKnowledge: (payload = {}) => ipcRenderer.invoke(IPC_CHANNELS.listKnowledge, payload),
  getKnowledgeCard: (cardId) => ipcRenderer.invoke(IPC_CHANNELS.getKnowledgeCard, { cardId })
});
