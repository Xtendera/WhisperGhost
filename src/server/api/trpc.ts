import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { CreateWSSContextFnOptions } from "@trpc/server/adapters/ws";
import cookie from "cookie";
import type { ServerResponse } from "http";
import prisma from "@/server/prisma";
import { extractTokenBody, generateToken } from "@/utils/jwt";

type ResponseHeaders = Pick<Headers, "append" | "set">;

type BaseContext = {
  type: "http" | "ws";
  headers: Headers;
  resHeaders: ResponseHeaders;
  request?: Request;
};

const noopHeaders: ResponseHeaders = {
  append() {},
  set() {},
};

const createResponseHeaders = (res: unknown): ResponseHeaders => {
  if (res && typeof (res as ServerResponse).setHeader === "function") {
    const serverRes = res as ServerResponse;
    return {
      append(name, value) {
        const current = serverRes.getHeader(name);
        if (current === undefined) {
          serverRes.setHeader(name, value);
          return;
        }
        if (Array.isArray(current)) {
          serverRes.setHeader(name, [...current, value]);
          return;
        }
        serverRes.setHeader(name, [String(current), value]);
      },
      set(name, value) {
        serverRes.setHeader(name, value);
      },
    } satisfies ResponseHeaders;
  }

  return noopHeaders;
};

const incomingHeadersToWebHeaders = (
  headers: NodeJS.Dict<string | string[] | undefined>,
) => {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (!key || value == null) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        result.append(key, entry);
      }
      continue;
    }
    result.append(key, value);
  }
  return result;
};

type CreateContextOptions =
  | FetchCreateContextFnOptions
  | CreateWSSContextFnOptions;

export const createContext = (options: CreateContextOptions): BaseContext => {
  if ("resHeaders" in options) {
    return {
      type: "http",
      headers: options.req.headers,
      resHeaders: options.resHeaders,
      request: options.req,
    };
  }

  return {
    type: "ws",
    headers: incomingHeadersToWebHeaders(options.req.headers),
  resHeaders: createResponseHeaders("res" in options ? options.res : undefined),
  };
};

export type Context = BaseContext;

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create();

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const cookiesHeader = ctx.headers.get("cookie") ?? "";
  const cookies = cookie.parse(cookiesHeader);
  const refreshToken = cookies.refreshToken;
  const accessToken = cookies.accessToken;

  const clearCookiesAndRedirect = (): never => {
    ctx.resHeaders.set("Location", "/login");
    ctx.resHeaders.append(
      "Set-Cookie",
      cookie.serialize("accessToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
        path: "/",
        sameSite: "lax",
      }),
    );
    ctx.resHeaders.append(
      "Set-Cookie",
      cookie.serialize("refreshToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
        path: "/",
        sameSite: "lax",
      }),
    );
    throw new TRPCError({ code: "UNAUTHORIZED" });
  };

  if (!refreshToken) {
    clearCookiesAndRedirect();
  }

  const refreshRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  const activeRefresh = refreshRecord ?? clearCookiesAndRedirect();

  const refreshAge = Date.now() - activeRefresh.issuedAt.getTime();
  const refreshLimit = 1000 * 60 * 60 * 24 * 7;

  if (refreshAge > refreshLimit) {
    await prisma.refreshToken
      .delete({ where: { id: activeRefresh.id } })
      .catch(() => undefined);
    clearCookiesAndRedirect();
  }

  if (accessToken) {
    const accessBody = await extractTokenBody(accessToken);
    if (
      accessBody &&
      accessBody.type === "access" &&
      accessBody.ref === activeRefresh.id &&
      accessBody.sub === activeRefresh.userId
    ) {
      return next({
        ctx: {
          ...ctx,
          isAuth: true as const,
          isRefresh: false as const,
          user: {
            id: activeRefresh.userId,
            username: activeRefresh.user.username,
          },
        },
      });
    }
  }

  const newAccessToken = await generateToken({
    sub: activeRefresh.userId,
    type: "access",
    user: activeRefresh.user.username,
    iat: Math.floor(Date.now() / 1000),
    ref: activeRefresh.id,
  });

  ctx.resHeaders.append(
    "Set-Cookie",
    cookie.serialize("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60,
      path: "/",
      sameSite: "lax",
    }),
  );

  return next({
    ctx: {
      ...ctx,
      isAuth: true as const,
      isRefresh: true as const,
      user: {
        id: activeRefresh.userId,
        username: activeRefresh.user.username,
      },
    },
  });
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);
