import crypto from "node:crypto";
import { ready, server } from "@serenity-kit/opaque";
import cookie from "cookie";
import { z } from "zod";
import prisma from "@/server/prisma";
import { extractTokenBody, generateToken } from "@/utils/jwt";
import { publicProcedure, router } from "../trpc";

const serverSetup = process.env.OPAQUE_SERVER_SETUP;

// Only allow alphanumeric, dashes, underscores, and periods
const usernameSchema = z
  .string()
  .min(2)
  .max(32)
  .regex(/^[a-zA-Z0-9._-]+$/);

// Check if a username is available
async function isAvailable(username: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });
  if (!user) {
    return true;
  } else {
    return false;
  }
}

export const authRouter = router({
  validateUsername: publicProcedure.input(usernameSchema).query(async (req) => {
    return await isAvailable(req.input);
  }),
  initialRegistration: publicProcedure
    .input(
      z.object({
        username: usernameSchema,
        email: z.email(),
        registrationRequest: z.string(),
      }),
    )
    .mutation(async (req) => {
      await ready; // Wait for OPAQUE to initialize
      if (!isAvailable(req.input.username)) {
        return {
          error: "Invalid Username",
          registrationResponse: "",
          registrationToken: "",
        };
      }
      if (!serverSetup) {
        return {
          error: "Invalid Server Secret",
          registrationResponse: "",
          registrationToken: "",
        };
      }
      const user = await prisma.user.create({
        data: {
          username: req.input.username,
          email: req.input.email,
          passwordRecord: "",
          joinedAt: new Date(),
        },
      });

      const { registrationResponse } = server.createRegistrationResponse({
        serverSetup,
        userIdentifier: user.id,
        registrationRequest: req.input.registrationRequest,
      });

      if (!registrationResponse) {
        return {
          error: "Internal Server Error: Invalid registrationResponse",
          registrationResponse: "",
          registrationToken: "",
        };
      }

      // Generate user JWT token (temporary)
      const token = await generateToken({
        sub: user.id,
        user: user.username,
        iat: Math.floor(Date.now() / 1000),
        type: "registration",
      });

      return {
        error: "",
        registrationResponse: registrationResponse,
        registrationToken: token,
      };
    }),
  finalRegistration: publicProcedure
    .input(
      z.object({
        registrationRecord: z.string().nonempty(),
        registrationToken: z.jwt(),
      }),
    )
    .mutation(async (req) => {
      // Verify JWT token and extract user ID
      const body = await extractTokenBody(req.input.registrationToken);
      // Check token and set expiry of 3 hours to finish registration
      if (
        !body ||
        body.type !== "registration" ||
        body.iat > Math.floor(Date.now() / 1000) + 60 * 60 * 3
      ) {
        // Token is invalid
        return {
          error: "Invalid Token",
        };
      }
      const userId = body.sub;
      const user = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          passwordRecord: req.input.registrationRecord,
        },
      });
      if (!user || !user.passwordRecord) {
        return {
          error: "Cannot Update user passwordRecord",
        };
      }

      // Generate a refresh token for the user
      const refreshToken = crypto.randomBytes(32).toString("hex");
      const tokenObj = await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          issuedAt: new Date(),
          user: {
            connect: {
              id: userId,
            },
          },
        },
      });
      if (!tokenObj) {
        return {
          error: "Cannot Generate refreshToken",
        };
      }

      const refreshCookie = cookie.serialize("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      req.ctx.resHeaders.append("Set-Cookie", refreshCookie);

      return {
        error: "",
      };
    }),
  // Create access token
  // const accessToken = await generateToken({
  //   sub: userId,
  //   type: "access",
  //   user: body.user,
  //   iat: Math.floor(Date.now() / 1000),
  // });
  // if (!accessToken) {
  //   return {
  //     error: "Cannot Generate accessToken",
  //     accessToken: "",
  //   };
  // }
});
