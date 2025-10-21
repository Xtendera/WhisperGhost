import { createWSClient } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/api/router";

export const trpc = createTRPCReact<AppRouter>();

export function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.RENDER_INTERNAL_HOSTNAME)
    return `http://${process.env.RENDER_INTERNAL_HOSTNAME}:${process.env.PORT}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function getWsUrl() {
  const browserWsUrl = process.env.NEXT_PUBLIC_WS_URL;
  const isDev = process.env.NODE_ENV !== "production";
  const path = isDev ? "/trpc" : "/api/trpc";
  if (typeof window !== "undefined") {
    if (browserWsUrl) return browserWsUrl;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    if (!isDev) {
      return `${protocol}://${window.location.host}${path}`;
    }

    const portFromEnv = process.env.NEXT_PUBLIC_WS_PORT;
    if (portFromEnv) {
      return `${protocol}://${window.location.hostname}:${portFromEnv}${path}`;
    }

    const httpPort = window.location.port
      ? Number.parseInt(window.location.port, 10)
      : 3000;
    const wsPort = httpPort + 1;
    return `${protocol}://${window.location.hostname}:${wsPort}${path}`;
  }

  if (process.env.WS_URL) return process.env.WS_URL;
  if (process.env.VERCEL_URL) return `wss://${process.env.VERCEL_URL}${path}`;
  if (process.env.RENDER_INTERNAL_HOSTNAME)
    return `ws://${process.env.RENDER_INTERNAL_HOSTNAME}:${process.env.PORT ?? "3000"}${path}`;

  if (isDev) {
    const defaultPort = process.env.WS_PORT ?? "3001";
    return `ws://localhost:${defaultPort}${path}`;
  }

  const defaultProdPort = process.env.PORT ?? "3000";
  return `ws://localhost:${defaultProdPort}${path}`;
}

let wsClient: ReturnType<typeof createWSClient> | null = null;

export function getWsClient() {
  if (!wsClient) {
    wsClient = createWSClient({
      url: getWsUrl(),
    });
  }
  return wsClient;
}
