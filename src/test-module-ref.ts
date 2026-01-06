
import { BunDIFactory } from './core/factory';
import { Module, Injectable, Controller, Get } from './core/decorators';
import { ModuleRef } from './core/injector/module-ref';

@Injectable()
class ServiceA {
    getHello() { return 'Hello A'; }
}

@Injectable()
class ServiceB {
    constructor(private moduleRef: ModuleRef) { }

    getA() {
        const serviceA = this.moduleRef.get(ServiceA);
        return serviceA.getHello();
    }
}

@Controller('moduleref')
class ModuleRefController {
    constructor(private serviceB: ServiceB) { }

    @Get()
    test() {
        return { message: this.serviceB.getA() };
    }
}

@Module({
    controllers: [ModuleRefController],
    providers: [ServiceA, ServiceB],
})
class AppModule { }

async function runTest() {
    const app = await BunDIFactory.create(AppModule);
    const hono = app.getHttpAdapter();

    const res = await hono.request('/moduleref', { method: 'GET' });
    const data = await res.json();
    console.log('ModuleRef Result:', data);
}

runTest();
