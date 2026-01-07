import type { Context } from 'hono';
import { Controller, Get, Post, Put, Delete } from '@hono-di/core';
import { UserService } from '../services/UserService';

@Controller('users')
export class UserController {
    constructor(private userService: UserService) { }

    @Get('')
    async getAll(c: Context) {
        const users = await this.userService.getAllUsers();
        return c.json(users);
    }

    @Get('/:id')
    async getOne(c: Context) {
        const id = c.req.param('id');
        const user = await this.userService.getUserById(id);
        return c.json(user);
    }

    @Post('/')
    async create(c: Context) {
        const data = await c.req.json();
        const user = await this.userService.createUser(data);
        return c.json(user, 201);
    }

    @Put('/:id')
    async update(c: Context) {
        const id = c.req.param('id');
        const data = await c.req.json();
        const user = await this.userService.updateUser(id, data);
        return c.json(user);
    }

    @Delete('/:id')
    async delete(c: Context) {
        const id = c.req.param('id');
        await this.userService.deleteUser(id);
        return c.json({ success: true });
    }
}
