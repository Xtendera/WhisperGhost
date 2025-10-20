import cookie from "cookie";
import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { generateToken } from "@/utils/jwt";

// This path is required because the middleware does not support tRPC calls, nor can it easily access the backend.

const refreshWindowMs = 1000 * 60 * 60 * 24 * 7;

// The vercel "edge" runtime will not work well here
export const runtime = "nodejs";

function unauthorizedResponse() {
  const response = NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 },
  );
  response.cookies.set("accessToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });
  response.cookies.set("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

export async function POST(request: Request) {
  const headerCookies = request.headers.get("cookie") ?? "";
  const cookies = cookie.parse(headerCookies);
  const refreshToken = cookies.refreshToken;

  if (!refreshToken) {
    return unauthorizedResponse();
  }

  const refreshRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!refreshRecord) {
    return unauthorizedResponse();
  }

  const isExpired =
    Date.now() - refreshRecord.issuedAt.getTime() > refreshWindowMs;

  if (isExpired) {
    await prisma.refreshToken
      .delete({ where: { id: refreshRecord.id } })
      .catch(() => undefined);
    return unauthorizedResponse();
  }

  const accessToken = await generateToken({
    sub: refreshRecord.userId,
    type: "access",
    user: refreshRecord.user.username,
    iat: Math.floor(Date.now() / 1000),
    ref: refreshRecord.id,
  });

  const response = NextResponse.json({ accessToken });

  response.cookies.set("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
