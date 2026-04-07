import { contextBridge, ipcRenderer } from "electron";

import { buildElectronApi } from "./ipc-api.js";

contextBridge.exposeInMainWorld("ukmApi", buildElectronApi(ipcRenderer.invoke.bind(ipcRenderer)));
