import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { UserService } from '../../services/UserService';
import { CreateUserDto, UpdateUserDto } from '../../models/User';

export const userRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const userService = ctx.container.resolve(UserService);
    return await userService.getAllUsers();
  }),

  getById: publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const userService = ctx.container.resolve(UserService);
      return await userService.getUserById(input);
    }),

  create: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(2),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userService = ctx.container.resolve(UserService);
      return await userService.createUser(input as CreateUserDto);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          email: z.string().email().optional(),
          name: z.string().min(2).optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userService = ctx.container.resolve(UserService);
      return await userService.updateUser(input.id, input.data as UpdateUserDto);
    }),

  delete: publicProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const userService = ctx.container.resolve(UserService);
      return await userService.deleteUser(input);
    }),
});
