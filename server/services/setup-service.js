import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function nowIso() {
  return new Date().toISOString();
}

const TEMPLATE_ROOT = fileURLToPath(new URL("../../templates/client-hooks/", import.meta.url));

const MANIFESTS = {
  cursor: {
    "hooks.json": "cursor/hooks.json.tpl",
    "hooks/chat-collect/save-prompt.js": "cursor/save-prompt.js",
    "hooks/chat-collect/write-conversation.js": "cursor/write-conversation.js",
    "hooks/chat-collect/append-thought.js": "cursor/append-thought.js",
    "hooks/chat-collect/append-file-read.js": "cursor/append-file-read.js",
    "hooks/chat-collect/append-edit.js": "cursor/append-edit.js",
    "hooks/chat-collect/append-shell.js": "cursor/append-shell.js",
    "hooks/chat-collect/append-mcp.js": "cursor/append-mcp.js",
    "hooks/chat-collect/paths.js": "cursor/paths.js"
  },
  codex: {
    "config.toml": "codex/config.toml.tpl",
    "hooks/save-prompt.py": "codex/save-prompt.py",
    "hooks/finalize-turn.py": "codex/finalize-turn.py",
    "hooks/replay-transcript.py": "codex/replay-transcript.py",
    "hooks/common.py": "codex/common.py"
  }
};

function renderTemplate(templatePath, values) {
  return readFileSync(templatePath, "utf8")
    .replaceAll("__INSTALL_ROOT__", values.installRoot)
    .replaceAll("__CAPTURE_OUTPUT_PATH__", values.captureOutputPath)
    .replaceAll("__CAPTURE_OUTPUT_PATH_JSON__", JSON.stringify(values.captureOutputPath));
}

export class SetupService {
  constructor({ repository, homeDir, templatesRoot = TEMPLATE_ROOT }) {
    this.repository = repository;
    this.homeDir = homeDir;
    this.templatesRoot = templatesRoot;
  }

  previewSetup({ dataSourceId, overwriteExistingHooks, mode }) {
    void mode;
    const manifest = MANIFESTS[dataSourceId];
    if (!manifest) {
      throw new Error(`Unsupported data source: ${dataSourceId}`);
    }

    const installRoot = join(this.homeDir, dataSourceId === "cursor" ? ".cursor" : ".codex");
    const captureOutputPath = join(installRoot, "knowledge-capture");
    const conflictFiles = [];
    const manifestPreview = {};

    for (const [relativePath] of Object.entries(manifest)) {
      const targetPath = join(installRoot, relativePath);
      const exists = safeExists(targetPath);
      manifestPreview[relativePath] = {
        action: exists ? "overwrite" : "create",
        targetPath
      };
      if (exists) {
        conflictFiles.push(targetPath);
      }
    }

    const source = this.repository.getDataSource(dataSourceId);
    return {
      dataSourceId,
      status: source.status,
      resolvedInstallRoot: installRoot,
      resolvedCaptureOutputPath: captureOutputPath,
      conflictFiles,
      warnings: [],
      canSubmit: overwriteExistingHooks || conflictFiles.length === 0,
      manifestPreview
    };
  }

  initializeDataSource({ dataSourceId, overwriteExistingHooks, mode }) {
    const preview = this.previewSetup({ dataSourceId, overwriteExistingHooks, mode });
    if (!preview.canSubmit) {
      return { ...preview, status: "failed" };
    }

    const manifest = MANIFESTS[dataSourceId];
    const backups = new Map();
    const createdFiles = [];

    try {
      for (const [relativePath, templateRelativePath] of Object.entries(manifest)) {
        const targetPath = join(preview.resolvedInstallRoot, relativePath);
        mkdirSync(dirname(targetPath), { recursive: true });
        if (safeExists(targetPath)) {
          backups.set(targetPath, readFileSync(targetPath, "utf8"));
        }
        const content = renderTemplate(join(this.templatesRoot, templateRelativePath), {
          installRoot: preview.resolvedInstallRoot,
          captureOutputPath: preview.resolvedCaptureOutputPath
        });
        writeFileSync(targetPath, content, "utf8");
        createdFiles.push(targetPath);
      }
      mkdirSync(preview.resolvedCaptureOutputPath, { recursive: true });

      const source = this.repository.getDataSource(dataSourceId);
      this.repository.saveDataSource({
        ...source,
        status: "ready",
        installRoot: preview.resolvedInstallRoot,
        captureOutputPath: preview.resolvedCaptureOutputPath,
        installedAt: nowIso(),
        lastErrorMessage: null
      });

      return {
        ...preview,
        status: "success"
      };
    } catch (error) {
      for (const targetPath of createdFiles) {
        if (backups.has(targetPath)) {
          writeFileSync(targetPath, backups.get(targetPath), "utf8");
        } else {
          safeUnlink(targetPath);
        }
      }
      return {
        ...preview,
        status: "failed",
        errorMessage: String(error)
      };
    }
  }
}

function safeExists(path) {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}

function safeUnlink(path) {
  try {
    unlinkSync(path);
  } catch {
    return;
  }
}
