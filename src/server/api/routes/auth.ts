import { z } from 'zod';
import prisma from '@/server/prisma';
import { publicProcedure, router } from '../trpc';

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
        registrationRequest: z.string()
      })
    )
    .mutation((req) => {
      if (!isAvailable(req.input.username)) {
        return {
          error: true,
        };
      }
    }),
});
