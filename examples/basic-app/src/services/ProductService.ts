import { Injectable } from 'hono-di';
import { ProductRepository } from '../repositories/ProductRepository';
import { Product, CreateProductDto, UpdateProductDto } from '../models/Product';
import { NotFoundError, BadRequestError } from 'hono-di';
import { LoggerService } from './LoggerService';

@Injectable()
export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private logger: LoggerService
  ) { }

  async getAllProducts(): Promise<Product[]> {
    this.logger.info('Fetching all products');
    return await this.productRepository.findAll();
  }

  async getProductById(id: string): Promise<Product> {
    this.logger.info(`Fetching product with id: ${id}`);
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new NotFoundError(`Product with id ${id} not found`);
    }

    return product;
  }

  async createProduct(data: CreateProductDto): Promise<Product> {
    this.logger.info(`Creating product: ${data.name}`);

    // Validate price and stock
    if (data.price < 0) {
      throw new BadRequestError('Price cannot be negative');
    }

    if (data.stock < 0) {
      throw new BadRequestError('Stock cannot be negative');
    }

    const product = await this.productRepository.create(data);
    this.logger.info(`Product created successfully with id: ${product.id}`);

    return product;
  }

  async updateProduct(id: string, data: UpdateProductDto): Promise<Product> {
    this.logger.info(`Updating product with id: ${id}`);

    // Validate if provided
    if (data.price !== undefined && data.price < 0) {
      throw new BadRequestError('Price cannot be negative');
    }

    if (data.stock !== undefined && data.stock < 0) {
      throw new BadRequestError('Stock cannot be negative');
    }

    const product = await this.productRepository.update(id, data);

    if (!product) {
      throw new NotFoundError(`Product with id ${id} not found`);
    }

    this.logger.info(`Product updated successfully with id: ${id}`);
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    this.logger.info(`Deleting product with id: ${id}`);
    const deleted = await this.productRepository.delete(id);

    if (!deleted) {
      throw new NotFoundError(`Product with id ${id} not found`);
    }

    this.logger.info(`Product deleted successfully with id: ${id}`);
  }

  async adjustStock(id: string, quantity: number): Promise<Product> {
    this.logger.info(`Adjusting stock for product ${id} by ${quantity}`);

    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with id ${id} not found`);
    }

    const newStock = product.stock + quantity;
    if (newStock < 0) {
      throw new BadRequestError('Insufficient stock');
    }

    const updatedProduct = await this.productRepository.updateStock(id, quantity);
    this.logger.info(`Stock adjusted for product ${id}. New stock: ${updatedProduct?.stock}`);

    return updatedProduct!;
  }
}
