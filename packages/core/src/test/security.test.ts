import { describe, it, expect } from 'bun:test';
import { Container } from '../injector/container';
import { Injector } from '../injector/injector';
import { Module } from '../injector/module';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Scope } from '../injector/scope';
import { ContextId } from '../injector/context-id';
import { Inject } from '../decorators';
import { Scanner } from '../scanner';

// Test security vulnerabilities
describe('Security', () => {
    it('should prevent __proto__ property injection', async () => {
        const TOKEN = Symbol('dangerous');

        class DangerousService {
            ['__proto__']: any; // Attempt to inject into __proto__

            constructor(@Inject(TOKEN) value: any) { }
        }

        const container = new Container();
        const module = container.addModule(class TestModule { }, 'TestModule');
        const injector = new Injector(container);

        const valueWrapper = new InstanceWrapper({
            token: TOKEN,
            name: 'DangerousValue',
            useValue: 'malicious',
            host: module,
            scope: Scope.DEFAULT
        });

        const dangerousWrapper = new InstanceWrapper({
            token: DangerousService,
            name: 'DangerousService',
            metatype: DangerousService,
            host: module,
            scope: Scope.DEFAULT,
            properties: [
                { key: '__proto__', token: TOKEN }
            ]
        });

        module.addProvider(valueWrapper);
        module.addProvider(dangerousWrapper);

        await expect(injector.loadInstance(dangerousWrapper, new ContextId()))
            .rejects
            .toThrow(/Unsafe property injection detected: __proto__/);
    });

    it('should prevent constructor property injection', async () => {
        const TOKEN = Symbol('dangerous');

        class DangerousService {
            // Trying to override constructor property
        }

        const container = new Container();
        const module = container.addModule(class TestModule { }, 'TestModule');
        const injector = new Injector(container);

        const valueWrapper = new InstanceWrapper({
            token: TOKEN,
            name: 'DangerousValue',
            useValue: 'malicious',
            host: module,
            scope: Scope.DEFAULT
        });

        const dangerousWrapper = new InstanceWrapper({
            token: DangerousService,
            name: 'DangerousService',
            metatype: DangerousService,
            host: module,
            scope: Scope.DEFAULT,
            properties: [
                { key: 'constructor', token: TOKEN }
            ]
        });

        module.addProvider(valueWrapper);
        module.addProvider(dangerousWrapper);

        await expect(injector.loadInstance(dangerousWrapper, new ContextId()))
            .rejects
            .toThrow(/Unsafe property injection detected: constructor/);
    });

    it('should prevent prototype property injection', async () => {
        const TOKEN = Symbol('dangerous');

        class DangerousService {
            prototype: any;
        }

        const container = new Container();
        const module = container.addModule(class TestModule { }, 'TestModule');
        const injector = new Injector(container);

        const valueWrapper = new InstanceWrapper({
            token: TOKEN,
            name: 'DangerousValue',
            useValue: 'malicious',
            host: module,
            scope: Scope.DEFAULT
        });

        const dangerousWrapper = new InstanceWrapper({
            token: DangerousService,
            name: 'DangerousService',
            metatype: DangerousService,
            host: module,
            scope: Scope.DEFAULT,
            properties: [
                { key: 'prototype', token: TOKEN }
            ]
        });

        module.addProvider(valueWrapper);
        module.addProvider(dangerousWrapper);

        await expect(injector.loadInstance(dangerousWrapper, new ContextId()))
            .rejects
            .toThrow(/Unsafe property injection detected: prototype/);
    });

    it('should allow safe property injection', async () => {
        const TOKEN = Symbol('safe');

        class SafeService {
            safeProperty: any;
        }

        const container = new Container();
        const module = container.addModule(class TestModule { }, 'TestModule');
        const injector = new Injector(container);

        const valueWrapper = new InstanceWrapper({
            token: TOKEN,
            name: 'SafeValue',
            useValue: 'safe data',
            host: module,
            scope: Scope.DEFAULT
        });

        const safeWrapper = new InstanceWrapper({
            token: SafeService,
            name: 'SafeService',
            metatype: SafeService,
            host: module,
            scope: Scope.DEFAULT,
            properties: [
                { key: 'safeProperty', token: TOKEN }
            ]
        });

        module.addProvider(valueWrapper);
        module.addProvider(safeWrapper);

        const instance = await injector.loadInstance(safeWrapper, new ContextId());
        expect(instance).toBeInstanceOf(SafeService);
        expect(instance.safeProperty).toBe('safe data');
    });

    it('should handle symbol keys safely', async () => {
        const TOKEN = Symbol('value');
        const PROP_KEY = Symbol('property');

        class SymbolService {
            [PROP_KEY]: any;
        }

        const container = new Container();
        const module = container.addModule(class TestModule { }, 'TestModule');
        const injector = new Injector(container);

        const valueWrapper = new InstanceWrapper({
            token: TOKEN,
            name: 'Value',
            useValue: 'symbol value',
            host: module,
            scope: Scope.DEFAULT
        });

        const symbolWrapper = new InstanceWrapper({
            token: SymbolService,
            name: 'SymbolService',
            metatype: SymbolService,
            host: module,
            scope: Scope.DEFAULT,
            properties: [
                { key: PROP_KEY, token: TOKEN }
            ]
        });

        module.addProvider(valueWrapper);
        module.addProvider(symbolWrapper);

        const instance = await injector.loadInstance(symbolWrapper, new ContextId());
        expect(instance).toBeInstanceOf(SymbolService);
        expect(instance[PROP_KEY]).toBe('symbol value');
    });
});
