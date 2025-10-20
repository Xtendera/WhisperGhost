import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { extractTokenBody } from "@/utils/jwt";

const cookieBaseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  sameSite: "lax" as const,
};

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  let isAuthenticated = false;
  let refreshedAccessToken: string | null = null;
  let shouldClearCookies = false;

  const attemptRefresh = async () => {
    if (!refreshToken) {
      return false;
    }
    try {
      const refreshUrl = new URL("/api/auth/refresh", request.url);
      const refreshResponse = await fetch(refreshUrl.toString(), {
        method: "POST",
        headers: {
          cookie: request.headers.get("cookie") ?? "",
          accept: "application/json",
        },
        cache: "no-store",
      });

      if (!refreshResponse.ok) {
        if (refreshResponse.status === 401) {
          shouldClearCookies = true;
        }
        return false;
      }

      const payload = await refreshResponse.json().catch(() => null);
      if (!payload?.accessToken) {
        return false;
      }
      refreshedAccessToken = payload.accessToken;
      return true;
    } catch {
      return false;
    }
  };

  if (accessToken) {
    const body = await extractTokenBody(accessToken);
    if (body && body.type === "access") {
      isAuthenticated = true;
    } else {
      isAuthenticated = await attemptRefresh();
    }
  } else if (refreshToken) {
    isAuthenticated = await attemptRefresh();
  }

  const applyCookies = (response: NextResponse) => {
    if (shouldClearCookies) {
      response.cookies.set("accessToken", "", {
        ...cookieBaseOptions,
        maxAge: 0,
      });
      response.cookies.set("refreshToken", "", {
        ...cookieBaseOptions,
        maxAge: 0,
      });
    }
    if (refreshedAccessToken) {
      response.cookies.set("accessToken", refreshedAccessToken, {
        ...cookieBaseOptions,
        maxAge: 60 * 60,
      });
    }
    return response;
  };

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/app")) {
    if (!isAuthenticated) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return applyCookies(NextResponse.redirect(loginUrl));
    }
    return applyCookies(NextResponse.next());
  }

  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/app";
    return applyCookies(NextResponse.redirect(appUrl));
  }

  return applyCookies(NextResponse.next());
}

export const config = {
  matcher: ["/app/:path*", "/login", "/register"],
};
