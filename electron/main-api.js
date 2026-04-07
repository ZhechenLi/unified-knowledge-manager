import { IPC_CHANNELS } from "./ipc-api.js";

export function buildMainApi(appContext) {
  return {
    [IPC_CHANNELS.getDashboard]: () => appContext.repository.getDashboard(),
    [IPC_CHANNELS.getSourceSetupState]: ({ dataSourceId }) =>
      appContext.setupService.previewSetup({
        dataSourceId,
        overwriteExistingHooks: false,
        mode: "initialize"
      }),
    [IPC_CHANNELS.previewSetup]: (payload) =>
      appContext.setupService.previewSetup({
        dataSourceId: payload.dataSourceId,
        overwriteExistingHooks: Boolean(payload.overwriteExistingHooks),
        mode: payload.mode ?? "initialize"
      }),
    [IPC_CHANNELS.initializeSource]: (payload) =>
      appContext.setupService.initializeDataSource({
        dataSourceId: payload.dataSourceId,
        overwriteExistingHooks: Boolean(payload.overwriteExistingHooks),
        mode: payload.mode ?? "initialize"
      }),
    [IPC_CHANNELS.syncSource]: ({ dataSourceId }) => appContext.ingestionService.ingestDataSource(dataSourceId),
    [IPC_CHANNELS.listSessions]: ({ dataSourceId }) => appContext.repository.listSessions({ dataSourceId }),
    [IPC_CHANNELS.summarizeSessions]: (payload) => appContext.summarizationService.createSummary(payload),
    [IPC_CHANNELS.listCandidates]: () => appContext.repository.listCandidates(),
    [IPC_CHANNELS.getCandidate]: ({ candidateId }) => appContext.repository.getCandidate(candidateId),
    [IPC_CHANNELS.confirmCandidate]: ({ candidateId }) => appContext.reviewService.confirmCandidate(candidateId),
    [IPC_CHANNELS.listKnowledge]: (payload = {}) => appContext.knowledgeService.searchKnowledge(payload),
    [IPC_CHANNELS.getKnowledgeCard]: ({ cardId }) => appContext.knowledgeService.getKnowledgeCard(cardId)
  };
}

export function registerIpcHandlers(ipcMain, appContext) {
  const handlers = buildMainApi(appContext);
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, (_event, payload = {}) => handler(payload));
  }
}
