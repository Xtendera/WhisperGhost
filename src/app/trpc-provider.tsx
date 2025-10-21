"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, splitLink, wsLink } from "@trpc/client";
import type { ReactNode } from "react";
import { useState } from "react";
import { getBaseUrl, getWsClient, trpc } from "@/utils/trpc";

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => {
    const http = httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    });

    const links =
      typeof window === "undefined"
        ? [http]
        : [
            splitLink({
              condition: (op) => op.type === "subscription",
              true: wsLink({ client: getWsClient() }),
              false: http,
            }),
          ];

    return trpc.createClient({
      links,
    });
  });

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}
