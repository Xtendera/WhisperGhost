import prisma from "@/server/prisma";
import { publicProcedure, router } from "../trpc";

export const healthRouter = router({
  ping: publicProcedure.query(() => {
    return "pong";
  }),
  db: publicProcedure.query(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      console.error("DB Connection failed: ", err);
      return false;
    }
    return true;
  }),
});
