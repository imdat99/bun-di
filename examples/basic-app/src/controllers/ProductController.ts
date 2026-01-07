import type { Context } from 'hono';
import { Controller, Get, Post, Put, Delete } from 'hono-di';
import { ProductService } from '../services/ProductService';

@Controller('products')
export class ProductController {
    constructor(private productService: ProductService) { }

    @Get('/')
    async getAll(c: Context) {
        const products = await this.productService.getAllProducts();
        return c.json(products);
    }

    @Get('/:id')
    async getOne(c: Context) {
        const id = c.req.param('id');
        const product = await this.productService.getProductById(id);
        return c.json(product);
    }

    @Post('/')
    async create(c: Context) {
        const data = await c.req.json();
        const product = await this.productService.createProduct(data);
        return c.json(product, 201);
    }

    @Put('/:id')
    async update(c: Context) {
        const id = c.req.param('id');
        const data = await c.req.json();
        const product = await this.productService.updateProduct(id, data);
        return c.json(product);
    }

    @Delete('/:id')
    async delete(c: Context) {
        const id = c.req.param('id');
        await this.productService.deleteProduct(id);
        return c.json({ success: true });
    }

    // Example of custom logic endpoint
    @Post('/:id/stock')
    async adjustStock(c: Context) {
        const id = c.req.param('id');
        const { quantity } = await c.req.json();
        const product = await this.productService.adjustStock(id, quantity);
        return c.json(product);
    }
}
