
import { BunDIFactory } from './core/factory';
import { Module, Injectable } from './core/decorators';
import { OnModuleInit, OnApplicationBootstrap } from './core/interfaces';
import { Hono } from 'hono';

@Module({})
class AppModule implements OnModuleInit, OnApplicationBootstrap {
    onModuleInit() {
        console.log('AppModule.onModuleInit called!');
    }

    onApplicationBootstrap() {
        console.log('AppModule.onApplicationBootstrap called!');
    }
}

async function runTest() {
    const app = new Hono();
    await BunDIFactory.create(AppModule, app);
}

runTest();
