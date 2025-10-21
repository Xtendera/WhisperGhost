import { randomInt } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { publicProcedure, router } from "../trpc";

export const testRouter = router({
  randomNumber: publicProcedure.subscription(async function* (opts) {
    while (true) {
      yield randomInt(300);
      await delay(1000);
    }
  }),
});
