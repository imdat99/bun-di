import { Module } from 'hono-di';
import { ProductController } from '../controllers/ProductController';
import { ProductService } from '../services/ProductService';
import { LoggerService } from '../services/LoggerService';
import { ProductRepository } from '../repositories/ProductRepository';

@Module({
    imports: [],
    controllers: [ProductController],
    providers: [ProductService, LoggerService, ProductRepository],
})
export class ProductModule { }
