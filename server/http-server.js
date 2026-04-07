import { createServer } from "node:http";

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, body) {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload)
  });
  response.end(payload);
}

export function createHttpServer(context) {
  return createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    try {
      if (request.method === "GET" && url.pathname === "/api/dashboard") {
        sendJson(response, 200, context.repository.getDashboard());
        return;
      }

      const sourceSetupMatch = url.pathname.match(/^\/api\/sources\/([^/]+)\/setup$/);
      if (request.method === "GET" && sourceSetupMatch) {
        const dataSourceId = sourceSetupMatch[1];
        sendJson(
          response,
          200,
          context.setupService.previewSetup({
            dataSourceId,
            overwriteExistingHooks: false,
            mode: "initialize"
          })
        );
        return;
      }

      const sourcePreviewMatch = url.pathname.match(/^\/api\/sources\/([^/]+)\/preview$/);
      if (request.method === "POST" && sourcePreviewMatch) {
        const dataSourceId = sourcePreviewMatch[1];
        const body = await readJson(request);
        sendJson(
          response,
          200,
          context.setupService.previewSetup({
            dataSourceId,
            overwriteExistingHooks: Boolean(body.overwriteExistingHooks),
            mode: body.mode ?? "initialize"
          })
        );
        return;
      }

      const sourceInitMatch = url.pathname.match(/^\/api\/sources\/([^/]+)\/initialize$/);
      if (request.method === "POST" && sourceInitMatch) {
        const dataSourceId = sourceInitMatch[1];
        const body = await readJson(request);
        sendJson(
          response,
          200,
          context.setupService.initializeDataSource({
            dataSourceId,
            overwriteExistingHooks: Boolean(body.overwriteExistingHooks),
            mode: body.mode ?? "initialize"
          })
        );
        return;
      }

      const sessionsMatch = url.pathname.match(/^\/api\/sources\/([^/]+)\/sessions$/);
      if (request.method === "GET" && sessionsMatch) {
        const dataSourceId = sessionsMatch[1];
        sendJson(response, 200, context.repository.listSessions({ dataSourceId }));
        return;
      }

      const syncMatch = url.pathname.match(/^\/api\/sources\/([^/]+)\/sync$/);
      if (request.method === "POST" && syncMatch) {
        const dataSourceId = syncMatch[1];
        sendJson(response, 200, context.ingestionService.ingestDataSource(dataSourceId));
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/summaries") {
        const body = await readJson(request);
        sendJson(response, 200, context.summarizationService.createSummary(body));
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/candidates") {
        sendJson(response, 200, context.repository.listCandidates());
        return;
      }

      const candidateMatch = url.pathname.match(/^\/api\/candidates\/([^/]+)$/);
      if (request.method === "GET" && candidateMatch) {
        sendJson(response, 200, context.repository.getCandidate(candidateMatch[1]));
        return;
      }

      const candidateConfirmMatch = url.pathname.match(/^\/api\/candidates\/([^/]+)\/confirm$/);
      if (request.method === "POST" && candidateConfirmMatch) {
        sendJson(response, 200, context.reviewService.confirmCandidate(candidateConfirmMatch[1]));
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/knowledge") {
        sendJson(
          response,
          200,
          context.knowledgeService.searchKnowledge({
            query: url.searchParams.get("query"),
            dataSourceId: url.searchParams.get("dataSourceId"),
            workspacePath: url.searchParams.get("workspacePath")
          })
        );
        return;
      }

      const knowledgeMatch = url.pathname.match(/^\/api\/knowledge\/([^/]+)$/);
      if (request.method === "GET" && knowledgeMatch) {
        sendJson(response, 200, context.knowledgeService.getKnowledgeCard(knowledgeMatch[1]));
        return;
      }

      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      sendJson(response, 500, { error: String(error) });
    }
  });
}
