import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import { appRouter } from "@/server/api/router";
import { createContext } from "@/server/api/trpc";

const port = Number.parseInt(process.env.WS_PORT ?? "3001", 10);
const hostname = process.env.WS_HOST ?? "0.0.0.0";
const path = process.env.WS_PATH ?? "/trpc";

const wss = new WebSocketServer({ port, host: hostname, path });
const handler = applyWSSHandler({
  wss,
  router: appRouter,
  createContext,
  prefix: path,
});

wss.on("connection", (ws) => {
  console.log(`[ws] connection open (${wss.clients.size})`);
  ws.once("close", () => {
    console.log(`[ws] connection closed (${wss.clients.size})`);
  });
});

console.log(`✅ WebSocket dev server listening at ws://${hostname}:${port}${path}`);

const shutdown = () => {
  handler.broadcastReconnectNotification();
  wss.close(() => {
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
