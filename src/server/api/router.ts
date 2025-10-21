import { appRouter as appFeatureRouter } from "./routes/app";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { testRouter } from "./routes/test";
import { router } from "./trpc";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  app: appFeatureRouter,
  test: testRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
