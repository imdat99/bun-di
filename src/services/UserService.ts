import { Injectable } from '../core/decorators';
import { UserRepository } from '../repositories/UserRepository';
import { User, CreateUserDto, UpdateUserDto, UserResponse } from '../models/User';
import { NotFoundError, ConflictError } from '../common/errors/AppError';
import { LoggerService } from './LoggerService';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private logger: LoggerService
  ) { }

  private toUserResponse(user: User): UserResponse {
    const { password, ...userResponse } = user;
    return userResponse;
  }

  async getAllUsers(): Promise<UserResponse[]> {
    this.logger.info('Fetching all users');
    const users = await this.userRepository.findAll();
    return users.map(user => this.toUserResponse(user));
  }

  async getUserById(id: string): Promise<UserResponse> {
    this.logger.info(`Fetching user with id: ${id}`);
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError(`User with id ${id} not found`);
    }

    return this.toUserResponse(user);
  }

  async createUser(data: CreateUserDto): Promise<UserResponse> {
    this.logger.info(`Creating user with email: ${data.email}`);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError(`User with email ${data.email} already exists`);
    }

    // In a real app, hash the password here
    const user = await this.userRepository.create(data);
    this.logger.info(`User created successfully with id: ${user.id}`);

    return this.toUserResponse(user);
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<UserResponse> {
    this.logger.info(`Updating user with id: ${id}`);

    // Check if email is being updated and if it's already taken
    if (data.email) {
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictError(`Email ${data.email} is already in use`);
      }
    }

    const user = await this.userRepository.update(id, data);

    if (!user) {
      throw new NotFoundError(`User with id ${id} not found`);
    }

    this.logger.info(`User updated successfully with id: ${id}`);
    return this.toUserResponse(user);
  }

  async deleteUser(id: string): Promise<void> {
    this.logger.info(`Deleting user with id: ${id}`);
    const deleted = await this.userRepository.delete(id);

    if (!deleted) {
      throw new NotFoundError(`User with id ${id} not found`);
    }

    this.logger.info(`User deleted successfully with id: ${id}`);
  }
}
