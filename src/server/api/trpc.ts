import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import cookie from "cookie";
import prisma from "@/server/prisma";
import { extractTokenBody, generateToken } from "@/utils/jwt";

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

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const cookiesHeader = ctx.req.headers.get("cookie") ?? "";
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
