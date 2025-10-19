import { initTRPC } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export type Context = {
  req: Request;
  resHeaders: Headers;
};

export const createContext = ({
  req,
  resHeaders,
}: FetchCreateContextFnOptions) => ({
  req,
  resHeaders,
});

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;
