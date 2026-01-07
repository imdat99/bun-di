import { describe, expect, test } from 'bun:test';
import 'reflect-metadata';
import { 
    Injectable, Module, Controller, Get, Post, 
    UseGuards, UsePipes, UseInterceptors, UseFilters, 
    Inject, Optional, Scope 
} from '../decorators';
import { METADATA_KEYS } from '../constants';

describe('Decorators', () => {
    test('@Injectable sets scope metadata', () => {
        @Injectable({ scope: Scope.REQUEST })
        class TestService {}

        const scope = Reflect.getMetadata(METADATA_KEYS.SCOPE, TestService);
        expect(scope).toBe(Scope.REQUEST);
    });

    test('@Module sets module metadata', () => {
        class Provider {}
        @Module({
            providers: [Provider],
            exports: [Provider]
        })
        class TestModule {}

        const options = Reflect.getMetadata(METADATA_KEYS.MODULE, TestModule);
        expect(options.providers).toContain(Provider);
        expect(options.exports).toContain(Provider);
    });

    test('@Controller sets controller metadata', () => {
        @Controller('api/test')
        class TestController {}

        const metadata = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, TestController);
        expect(metadata).toEqual({ prefix: 'api/test' });
        
        const scope = Reflect.getMetadata(METADATA_KEYS.SCOPE, TestController);
        expect(scope).toBe(Scope.DEFAULT);
    });

    test('HTTP Method decorators set route metadata', () => {
        class TestController {
            @Get('users')
            getUsers() {}

            @Post('users')
            createUsers() {}
        }

        const routes = Reflect.getMetadata(METADATA_KEYS.ROUTES, TestController);
        expect(routes).toHaveLength(2);
        
        const getRoute = routes.find((r: any) => r.methodName === 'getUsers');
        expect(getRoute.requestMethod).toBe('get');
        expect(getRoute.path).toBe('users');

        const postRoute = routes.find((r: any) => r.methodName === 'createUsers');
        expect(postRoute.requestMethod).toBe('post');
    });

    test('Middleware decorators set metadata', () => {
        class TestGuard {}
        
        @UseGuards(TestGuard)
        class TestController {
            @UsePipes('Pipe')
            method() {}
        }

        const classGuards = Reflect.getMetadata(METADATA_KEYS.USE_GUARDS, TestController);
        expect(classGuards).toEqual([TestGuard]);

        const descriptor = Object.getOwnPropertyDescriptor(TestController.prototype, 'method');
        const methodPipes = Reflect.getMetadata(METADATA_KEYS.USE_PIPES, descriptor!.value);
        expect(methodPipes).toEqual(['Pipe']);
    });

    test('Property Injection decorators set metadata', () => {
        class TestService {
            @Inject('TOKEN')
            @Optional()
            dependency: any;
        }

        const properties = Reflect.getMetadata(METADATA_KEYS.PROPERTY_DEPS, TestService);
        expect(properties).toHaveLength(1);
        expect(properties[0].key).toBe('dependency');
        expect(properties[0].token).toBe('TOKEN');

        const optionals = Reflect.getMetadata(METADATA_KEYS.OPTIONAL, TestService);
        expect(optionals).toContain('dependency');
    });

    test('Constructor Parameter decorators set metadata', () => {
        class TestService {
            constructor(
                @Inject('TOKEN') param1: any,
                @Optional() param2: any
            ) {}
        }

        const injections = Reflect.getMetadata(METADATA_KEYS.INJECTIONS, TestService);
        expect(injections[0]).toBe('TOKEN');

        const optionals = Reflect.getMetadata(METADATA_KEYS.OPTIONAL, TestService);
        expect(optionals[1]).toBe(true);
    });
});
