import { Module } from '@hono-di/core';
import { HealthController } from './controllers/HealthController';
import { UserModule } from './modules/UserModule';
import { ProductModule } from './modules/ProductModule';
import { ExampleController } from './controllers/ExampleController';

@Module({
    imports: [UserModule, ProductModule],
    controllers: [HealthController, ExampleController],
    providers: [],
})
export class AppModule { }
