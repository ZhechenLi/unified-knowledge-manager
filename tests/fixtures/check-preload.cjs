const { mkdtempSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { app, BrowserWindow } = require("electron");

const projectDir = join(__dirname, "..", "..");
const preloadPath = join(projectDir, "electron", "preload.cjs");

app.whenReady().then(async () => {
  const htmlDir = mkdtempSync(join(tmpdir(), "ukm-preload-"));
  const htmlPath = join(htmlDir, "index.html");
  writeFileSync(htmlPath, "<!doctype html><html><body><div id='root'></div></body></html>", "utf8");

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath
    }
  });

  win.webContents.on("console-message", (event) => {
    console.log(event.message);
  });

  try {
    await win.loadFile(htmlPath);
    const preloadType = await win.webContents.executeJavaScript("typeof window.ukmApi");
    console.log(`UKM_API_TYPE ${preloadType}`);
    process.exitCode = preloadType === "object" ? 0 : 1;
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  } finally {
    win.destroy();
    await app.quit();
  }
});
