import { router } from '../trpc';
import { userRouter } from './userRouter';
import { productRouter } from './productRouter';

export const appRouter = router({
  user: userRouter,
  product: productRouter,
});

export type AppRouter = typeof appRouter;
