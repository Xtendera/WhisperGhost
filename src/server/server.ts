import { createServer } from "node:http";
import type { Socket } from "node:net";
import { parse } from "node:url";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import next from "next";
import { WebSocketServer } from "ws";
import { appRouter } from "./api/router";
import { createContext } from "./api/trpc";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const dev = process.env.NODE_ENV !== "production";

async function main() {
  const app = next({ dev });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer((req, res) => {
    if (!req.url) return;
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });
  const handler = applyWSSHandler({
    wss,
    router: appRouter,
    createContext,
    prefix: "/api/trpc",
  });

  wss.on("connection", (ws) => {
    console.log(`[ws] connection open (${wss.clients.size})`);
    ws.once("close", () => {
      console.log(`[ws] connection closed (${wss.clients.size})`);
    });
  });

  server.on("upgrade", (req, socket, head) => {
    if (!req.url?.startsWith("/api/trpc")) {
      return;
    }

    wss.handleUpgrade(req, socket as Socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  server.listen(port, () => {
    console.log(
      `> Server listening at http://localhost:${port} (${dev ? "dev" : "prod"})`,
    );
  });

  const shutdown = () => {
    handler.broadcastReconnectNotification();
    wss.close();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
