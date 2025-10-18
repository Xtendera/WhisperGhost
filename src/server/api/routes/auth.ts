import { ready, server } from "@serenity-kit/opaque";
import { z } from "zod";
import prisma from "@/server/prisma";
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
        };
      }
      if (!serverSetup) {
        return {
          error: "Invalid Server Secret",
          registrationResponse: "",
        };
      }
      const user = await prisma.user.create({
        data: {
          username: req.input.username,
          email: req.input.email,
          passwordRecord: "",
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
        };
      }
      return {
        error: "",
        registrationResponse: registrationResponse,
      };
    }),
  finishRegistration: publicProcedure
    .input(z.string().nonempty())
    .mutation(async (req) => {}),
});
