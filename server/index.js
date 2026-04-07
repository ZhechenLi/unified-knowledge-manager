import { resolve } from "node:path";

import { createAppContext } from "./create-app-context.js";
import { createHttpServer } from "./http-server.js";

const rootDir = resolve(process.cwd(), ".runtime");
const homeDir = resolve(rootDir, "home");
const port = Number(process.env.PORT ?? 4310);

const context = createAppContext({ rootDir, homeDir });
const server = createHttpServer(context);

server.listen(port, () => {
  console.log(`Unified knowledge backend listening on http://127.0.0.1:${port}`);
});
