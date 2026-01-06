import { IRepository } from './IRepository';
import { Product, CreateProductDto } from '../models/Product';
import { Injectable } from '../core/decorators';

@Injectable()
export class ProductRepository implements IRepository<Product> {
  private products: Map<string, Product> = new Map();
  private idCounter = 1;

  constructor() {
    this.seedData();
  }

  private seedData(): void {
    const products: Product[] = [
      {
        id: '1',
        name: 'Laptop Dell XPS 15',
        description: 'High-performance laptop for professionals',
        price: 1500,
        stock: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone with advanced features',
        price: 999,
        stock: 25,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: 'Sony WH-1000XM5',
        description: 'Premium noise-cancelling headphones',
        price: 399,
        stock: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    products.forEach(product => {
      this.products.set(product.id, product);
    });
    this.idCounter = 4;
  }

  async findAll(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  async create(data: CreateProductDto): Promise<Product> {
    const id = String(this.idCounter++);
    const now = new Date();

    const product: Product = {
      id,
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      createdAt: now,
      updatedAt: now,
    };

    this.products.set(id, product);
    return product;
  }

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    const product = this.products.get(id);
    if (!product) return null;

    const updatedProduct: Product = {
      ...product,
      ...data,
      id: product.id,
      updatedAt: new Date(),
    };

    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async delete(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  async updateStock(id: string, quantity: number): Promise<Product | null> {
    const product = this.products.get(id);
    if (!product) return null;

    product.stock += quantity;
    product.updatedAt = new Date();

    this.products.set(id, product);
    return product;
  }
}
