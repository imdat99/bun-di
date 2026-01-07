import { Module } from 'hono-di';
import { UserController } from '../controllers/UserController';
import { UserService } from '../services/UserService';
import { LoggerService } from '../services/LoggerService';
import { UserRepository } from '../repositories/UserRepository';

@Module({
    imports: [],
    controllers: [UserController],
    providers: [UserService, LoggerService, UserRepository],
})
export class UserModule { }
