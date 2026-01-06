import { singleton } from 'tsyringe';
import { IRepository } from './IRepository';
import { User, CreateUserDto } from '../models/User';

@singleton()
export class UserRepository implements IRepository<User> {
  private users: Map<string, User> = new Map();
  private idCounter = 1;

  constructor() {
    // Seed with some initial data
    this.seedData();
  }

  private seedData(): void {
    const user1: User = {
      id: '1',
      email: 'admin@example.com',
      password: '$2a$10$XYZ...', // In real app, this would be hashed
      name: 'Admin User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const user2: User = {
      id: '2',
      email: 'user@example.com',
      password: '$2a$10$ABC...',
      name: 'Regular User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user1.id, user1);
    this.users.set(user2.id, user2);
    this.idCounter = 3;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = Array.from(this.users.values());
    return users.find(user => user.email === email) || null;
  }

  async create(data: CreateUserDto): Promise<User> {
    const id = String(this.idCounter++);
    const now = new Date();
    
    const user: User = {
      id,
      email: data.email,
      password: data.password,
      name: data.name,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, user);
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updatedUser: User = {
      ...user,
      ...data,
      id: user.id, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}
