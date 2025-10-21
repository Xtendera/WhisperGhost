import { randomInt } from "node:crypto";
import { publicProcedure, router } from "../trpc";

export const testRouter = router({
  randomNumber: publicProcedure.query(() => randomInt(300)),
});
