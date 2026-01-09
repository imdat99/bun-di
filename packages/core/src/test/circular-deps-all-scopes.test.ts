import { describe, it, expect } from 'bun:test';
import { Container } from '../injector/container';
import { Injector } from '../injector/injector';
import { Module } from '../injector/module';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Scope } from '../injector/scope';
import { ContextId } from '../injector/context-id';

// Test circular dependency detection for ALL scopes
describe('Circular Dependencies - All Scopes', () => {
    it('should detect circular dependencies in DEFAULT scope', async () => {
        class ServiceA {
            constructor(public serviceB: ServiceB) { }
        }

        class ServiceB {
            constructor(public serviceA: ServiceA) { }
        }

        const container = new Container();
        const module = container.addModule(class TestModule { }, 'TestModule');
        const injector = new Injector(container);

        const wrapperA = new InstanceWrapper({
            token: ServiceA,
            name: 'ServiceA',
            metatype: ServiceA,
            host: module,
            scope: Scope.DEFAULT,
            inject: [ServiceB]
        });

        const wrapperB = new InstanceWrapper({
            token: ServiceB,
            name: 'ServiceB',
            metatype: ServiceB,
            host: module,
            scope: Scope.DEFAULT,
            inject: [ServiceA]
        });

        module.addProvider(wrapperA);
        module.addProvider(wrapperB);

        await expect(injector.loadInstance(wrapperA, new ContextId()))
            .rejects
            .toThrow(/Circular dependency detected/);
    });

    it('should detect circular dependencies in REQUEST scope', async () => {
        class RequestServiceA {
            constructor(public serviceB: RequestServiceB) { }
        }

        class RequestServiceB {
            constructor(public serviceA: RequestServiceA) { }
        }

        const container = new Container();
        const module = container.addModule(class TestModule { }, 'TestModule');
        const injector = new Injector(container);

        const wrapperA = new InstanceWrapper({
            token: RequestServiceA,
            name: 'RequestServiceA',
            metatype: RequestServiceA,
            host: module,
            scope: Scope.REQUEST,
            inject: [RequestServiceB]
        });

        const wrapperB = new InstanceWrapper({
            token: RequestServiceB,
            name: 'RequestServiceB',
            metatype: RequestServiceB,
            host: module,
            scope: Scope.REQUEST,
            inject: [RequestServiceA]
        });

        module.addProvider(wrapperA);
        module.addProvider(wrapperB);

        await expect(injector.loadInstance(wrapperA, new ContextId()))
            .rejects
            .toThrow(/Circular dependency detected/);
    });

    it('should detect circular dependencies in TRANSIENT scope', async () => {
        class TransientServiceA {
            constructor(public serviceB: TransientServiceB) { }
        }

        class TransientServiceB {
            constructor(public serviceA: TransientServiceA) { }
        }

        const container = new Container();
        const module = container.addModule(class TestModule { }, 'TestModule');
        const injector = new Injector(container);

        const wrapperA = new InstanceWrapper({
            token: TransientServiceA,
            name: 'TransientServiceA',
            metatype: TransientServiceA,
            host: module,
            scope: Scope.TRANSIENT,
            inject: [TransientServiceB]
        });

        const wrapperB = new InstanceWrapper({
            token: TransientServiceB,
            name: 'TransientServiceB',
            metatype: TransientServiceB,
            host: module,
            scope: Scope.TRANSIENT,
            inject: [TransientServiceA]
        });

        module.addProvider(wrapperA);
        module.addProvider(wrapperB);

        await expect(injector.loadInstance(wrapperA, new ContextId()))
            .rejects
            .toThrow(/Circular dependency detected/);
    });

    it('should include dependency chain in error message', async () => {
        class ServiceA {
            constructor(public serviceB: ServiceB) { }
        }

        class ServiceB {
            constructor(public serviceC: ServiceC) { }
        }

        class ServiceC {
            constructor(public serviceA: ServiceA) { }
        }

        const container = new Container();
        const module = container.addModule(class TestModule { }, 'TestModule');
        const injector = new Injector(container);

        const wrapperA = new InstanceWrapper({
            token: ServiceA,
            name: 'ServiceA',
            metatype: ServiceA,
            host: module,
            scope: Scope.DEFAULT,
            inject: [ServiceB]
        });

        const wrapperB = new InstanceWrapper({
            token: ServiceB,
            name: 'ServiceB',
            metatype: ServiceB,
            host: module,
            scope: Scope.DEFAULT,
            inject: [ServiceC]
        });

        const wrapperC = new InstanceWrapper({
            token: ServiceC,
            name: 'ServiceC',
            metatype: ServiceC,
            host: module,
            scope: Scope.DEFAULT,
            inject: [ServiceA]
        });

        module.addProvider(wrapperA);
        module.addProvider(wrapperB);
        module.addProvider(wrapperC);

        try {
            await injector.loadInstance(wrapperA, new ContextId());
            expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
            expect(error.message).toContain('ServiceA');
            expect(error.message).toContain('ServiceB');
            expect(error.message).toContain('ServiceC');
            expect(error.message).toContain('->');
        }
    });

    it('should allow complex dependency graphs without cycles', async () => {
        class ServiceD {
            constructor() { }
        }

        class ServiceC {
            constructor(public serviceD: ServiceD) { }
        }

        class ServiceB {
            constructor(public serviceC: ServiceC, public serviceD: ServiceD) { }
        }

        class ServiceA {
            constructor(public serviceB: ServiceB, public serviceC: ServiceC) { }
        }

        const container = new Container();
        const module = container.addModule(class TestModule { }, 'TestModule');
        const injector = new Injector(container);

        const wrapperD = new InstanceWrapper({
            token: ServiceD,
            name: 'ServiceD',
            metatype: ServiceD,
            host: module,
            scope: Scope.DEFAULT,
            inject: []
        });

        const wrapperC = new InstanceWrapper({
            token: ServiceC,
            name: 'ServiceC',
            metatype: ServiceC,
            host: module,
            scope: Scope.DEFAULT,
            inject: [ServiceD]
        });

        const wrapperB = new InstanceWrapper({
            token: ServiceB,
            name: 'ServiceB',
            metatype: ServiceB,
            host: module,
            scope: Scope.DEFAULT,
            inject: [ServiceC, ServiceD]
        });

        const wrapperA = new InstanceWrapper({
            token: ServiceA,
            name: 'ServiceA',
            metatype: ServiceA,
            host: module,
            scope: Scope.DEFAULT,
            inject: [ServiceB, ServiceC]
        });

        module.addProvider(wrapperD);
        module.addProvider(wrapperC);
        module.addProvider(wrapperB);
        module.addProvider(wrapperA);

        // Should not throw
        const instance = await injector.loadInstance(wrapperA, new ContextId());
        expect(instance).toBeInstanceOf(ServiceA);
        expect(instance.serviceB).toBeInstanceOf(ServiceB);
        expect(instance.serviceC).toBeInstanceOf(ServiceC);
        expect(instance.serviceB.serviceC).toBe(instance.serviceC); // Singleton
    });
});
