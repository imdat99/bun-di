
import { BunDIFactory } from './core/factory';
import { Module, Controller, Get, Param, SetMetadata } from './core/decorators';
import { BadRequestException } from './common/exceptions';
import { ParseIntPipe } from './common/pipes';
import { Reflector } from './core/services/reflector.service';

@Controller('stdlib')
class StdLibController {
    constructor(private reflector: Reflector) { }

    @Get('exception')
    exception() {
        throw new BadRequestException('Bad Request Test');
    }

    @Get('pipe/:id')
    pipe(@Param('id', ParseIntPipe) id: number) {
        return { id, type: typeof id };
    }

    @Get('reflector')
    @SetMetadata('roles', ['admin'])
    reflect() {
        const roles = this.reflector.get('roles', StdLibController.prototype.reflect);
        return { roles };
    }
}

@Module({
    controllers: [StdLibController],
    providers: [Reflector],
})
class AppModule { }

async function runTest() {
    const app = await BunDIFactory.create(AppModule);
    const hono = app.getHttpAdapter();

    console.log('--- Exception Test ---');
    const res1 = await hono.request('/stdlib/exception', { method: 'GET' });
    console.log('Status:', res1.status);
    console.log('Body:', await res1.json());

    console.log('\n--- Pipe Test (Valid) ---');
    const res2 = await hono.request('/stdlib/pipe/123', { method: 'GET' });
    console.log('Body:', await res2.json());

    console.log('\n--- Pipe Test (Invalid) ---');
    const res3 = await hono.request('/stdlib/pipe/abc', { method: 'GET' });
    console.log('Status:', res3.status);
    console.log('Body:', await res3.json());

    console.log('\n--- Reflector Test ---');
    const res4 = await hono.request('/stdlib/reflector', { method: 'GET' });
    console.log('Body:', await res4.json());
}

runTest();
