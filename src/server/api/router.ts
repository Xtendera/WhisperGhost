import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { router } from './trpc';

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
