import { describe, it, expect } from 'bun:test';
import { Injectable, Module, Inject, forwardRef, HonoDiFactory } from '../index';

@Injectable()
class ServiceA {
    constructor(@Inject(forwardRef(() => ServiceB)) public serviceB: any) { }
    getHello() { return 'Hello from A'; }
    callB() { return this.serviceB.getHello(); }
}

@Injectable()
class ServiceB {
    constructor(@Inject(forwardRef(() => ServiceA)) public serviceA: ServiceA) { }
    getHello() { return 'Hello from B'; }
    callA() { return this.serviceA.getHello(); }
}

@Module({
    providers: [ServiceA, ServiceB],
    exports: [ServiceA, ServiceB]
})
class TestModule { }

describe('Circular Dependency', () => {
    it('should resolve circular dependencies using forwardRef', async () => {
        const app = await HonoDiFactory.create(TestModule);
        const serviceA = app.get(ServiceA);
        const serviceB = app.get(ServiceB);

        expect(serviceA).toBeDefined();
        expect(serviceB).toBeDefined();

        // Properties are defined
        expect(serviceA.serviceB).toBeDefined();
        expect(serviceB.serviceA).toBeDefined();

        // They are Proxies, not the original instances
        // Note: This behavior is specific to the implementation of forwardRef which uses Proxy
        expect(serviceA.serviceB).not.toBe(serviceB);
        expect(serviceB.serviceA).not.toBe(serviceA);

        // Verify proxy resolution via method calls
        expect(serviceA.callB()).toBe('Hello from B');
        expect(serviceB.callA()).toBe('Hello from A');

        // Verify deep chaining
        expect(serviceA.serviceB.callA()).toBe('Hello from A');
        expect(serviceB.serviceA.callB()).toBe('Hello from B');
    });
});
