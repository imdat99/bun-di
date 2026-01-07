
// import { HonoDiFactory } from '../factory';
import { HonoDiFactory } from '../factory';
import { Module, Injectable } from '../decorators';
import { OnModuleInit, OnApplicationBootstrap } from '../interfaces';
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
    await HonoDiFactory.create(AppModule, app);
}

runTest();
