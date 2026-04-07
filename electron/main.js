import { app, BrowserWindow, ipcMain } from "electron";
import os from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createAppContext } from "../server/create-app-context.js";
import { registerIpcHandlers as registerMainIpcHandlers } from "./main-api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rendererHtml = join(__dirname, "..", "dist", "index.html");

let mainWindow = null;
let context = null;

function createContext() {
  if (context) {
    return context;
  }

  context = createAppContext({
    rootDir: app.getPath("userData"),
    homeDir: os.homedir()
  });
  return context;
}

function wireIpcHandlers() {
  const appContext = createContext();
  registerMainIpcHandlers(ipcMain, appContext);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    title: "Unified Knowledge Manager",
    backgroundColor: "#f4efe7",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "preload.js")
    }
  });

  await mainWindow.loadFile(rendererHtml);
}

app.whenReady().then(async () => {
  wireIpcHandlers();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
