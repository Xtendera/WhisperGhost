import { healthRouter } from "./routes/health";
import { router } from "./trpc";

export const appRouter = router({
  health: healthRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
