import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { createDatabase } from "./database.js";
import { Repository } from "./repository.js";
import { IngestionService } from "./services/ingestion-service.js";
import { KnowledgeService } from "./services/knowledge-service.js";
import { ReviewService } from "./services/review-service.js";
import { SetupService } from "./services/setup-service.js";
import { SummarizationService } from "./services/summarization-service.js";

export function createAppContext({ rootDir, homeDir }) {
  mkdirSync(rootDir, { recursive: true });
  mkdirSync(homeDir, { recursive: true });

  const database = createDatabase({ dataDir: join(rootDir, "app-data") });
  const repository = new Repository(database);
  const setupService = new SetupService({ repository, homeDir });
  const ingestionService = new IngestionService({ repository });
  const summarizationService = new SummarizationService({ repository });
  const reviewService = new ReviewService({ repository });
  const knowledgeService = new KnowledgeService({ repository });

  return {
    database,
    repository,
    setupService,
    ingestionService,
    summarizationService,
    reviewService,
    knowledgeService
  };
}
