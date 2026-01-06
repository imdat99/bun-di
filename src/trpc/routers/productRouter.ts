import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { ProductService } from '../../services/ProductService';
import { CreateProductDto, UpdateProductDto } from '../../models/Product';

export const productRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const productService = ctx.container.resolve(ProductService);
    return await productService.getAllProducts();
  }),

  getById: publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const productService = ctx.container.resolve(ProductService);
      return await productService.getProductById(input);
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(2),
        description: z.string(),
        price: z.number().min(0),
        stock: z.number().int().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const productService = ctx.container.resolve(ProductService);
      return await productService.createProduct(input as CreateProductDto);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(2).optional(),
          description: z.string().optional(),
          price: z.number().min(0).optional(),
          stock: z.number().int().min(0).optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const productService = ctx.container.resolve(ProductService);
      return await productService.updateProduct(input.id, input.data as UpdateProductDto);
    }),

  delete: publicProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const productService = ctx.container.resolve(ProductService);
      return await productService.deleteProduct(input);
    }),

  adjustStock: publicProcedure
    .input(
      z.object({
        id: z.string(),
        quantity: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const productService = ctx.container.resolve(ProductService);
      return await productService.adjustStock(input.id, input.quantity);
    }),
});
