async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export function createBrowserApi() {
  return {
    getDashboard: () => request("/api/dashboard"),
    getSourceSetupState: (dataSourceId) => request(`/api/sources/${dataSourceId}/setup`),
    previewSetup: (dataSourceId, payload) =>
      request(`/api/sources/${dataSourceId}/preview`, {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    initializeSource: (dataSourceId, payload) =>
      request(`/api/sources/${dataSourceId}/initialize`, {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    syncSource: (dataSourceId) =>
      request(`/api/sources/${dataSourceId}/sync`, {
        method: "POST"
      }),
    listSessions: (dataSourceId) => request(`/api/sources/${dataSourceId}/sessions`),
    summarizeSessions: (payload) =>
      request("/api/summaries", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    listCandidates: () => request("/api/candidates"),
    getCandidate: (candidateId) => request(`/api/candidates/${candidateId}`),
    confirmCandidate: (candidateId) =>
      request(`/api/candidates/${candidateId}/confirm`, {
        method: "POST"
      }),
    listKnowledge: ({ query = "", dataSourceId = "", workspacePath = "" } = {}) => {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (dataSourceId) params.set("dataSourceId", dataSourceId);
      if (workspacePath) params.set("workspacePath", workspacePath);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      return request(`/api/knowledge${suffix}`);
    },
    getKnowledgeCard: (cardId) => request(`/api/knowledge/${cardId}`)
  };
}

export function createAppApi() {
  if (typeof window !== "undefined" && window.ukmApi) {
    return window.ukmApi;
  }
  return createBrowserApi();
}
