
import { BunDIFactory } from './core/factory';
import { Module, Injectable, Inject, Controller, Get } from './core/decorators';
import { forwardRef } from './core/utils';

// --- Service A ---
@Injectable()
class ServiceA {
    constructor(
        @Inject(forwardRef(() => ServiceB))
        private readonly serviceB: any
    ) { }

    getHello(): string {
        return 'Hello from A';
    }

    callB(): string {
        return this.serviceB.getHello();
    }
}

// --- Service B ---
@Injectable()
class ServiceB {
    constructor(
        @Inject(forwardRef(() => ServiceA))
        private readonly serviceA: any
    ) { }

    getHello(): string {
        return 'Hello from B';
    }

    callA(): string {
        return this.serviceA.getHello();
    }
}

// --- Module A ---
@Module({
    imports: [forwardRef(() => ModuleB)],
    providers: [ServiceA],
    exports: [ServiceA],
})
class ModuleA { }

// --- Module B ---
@Module({
    imports: [forwardRef(() => ModuleA)],
    providers: [ServiceB],
    exports: [ServiceB],
})
class ModuleB { }

// --- Controller ---
@Controller('circular')
class CircularController {
    constructor(private readonly serviceA: ServiceA) { }

    @Get()
    test() {
        return {
            a: this.serviceA.getHello(),
            b_via_a: this.serviceA.callB(),
        };
    }
}

// --- App Module ---
@Module({
    imports: [ModuleA, ModuleB],
    controllers: [CircularController],
})
class AppModule { }

// --- Test ---
async function runTest() {
    const app = await BunDIFactory.create(AppModule);
    const hono = app.getHttpAdapter();

    const res = await hono.request('/circular', { method: 'GET' });
    const data = await res.json();
    console.log('Circular Result:', data);
}

runTest();
