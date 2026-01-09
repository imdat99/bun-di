import { describe, it, expect } from 'bun:test';
import { HonoDiFactory } from '../factory';
import { Module, Controller, Get, Injectable, Inject } from '../decorators';
import { ModuleRef } from '../injector/module-ref';

describe('ModuleRef', () => {
    it('should get provider instance by token', async () => {
        @Injectable()
        class TestService {
            getValue() {
                return 'test-value';
            }
        }

        @Injectable()
        class ConsumerService {
            constructor(private readonly moduleRef: ModuleRef) {}

            getServiceValue() {
                const service = this.moduleRef.get(TestService);
                return service.getValue();
            }
        }

        @Module({
            providers: [TestService, ConsumerService],
            exports: [TestService]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const container = app.getContainer();
        const modules = container.getModules();
        const module = Array.from(modules.values())[0];
        
        const consumerWrapper = module.getProvider(ConsumerService);
        expect(consumerWrapper).toBeDefined();
        
        const consumer = consumerWrapper?.instance as ConsumerService;
        expect(consumer.getServiceValue()).toBe('test-value');
    });

    it('should resolve provider instance asynchronously', async () => {
        @Injectable()
        class AsyncService {
            async getData() {
                return 'async-data';
            }
        }

        @Injectable()
        class ConsumerService {
            constructor(private readonly moduleRef: ModuleRef) {}

            async getAsyncData() {
                const service = await this.moduleRef.resolve(AsyncService);
                return service.getData();
            }
        }

        @Module({
            providers: [AsyncService, ConsumerService]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const container = app.getContainer();
        const modules = container.getModules();
        const module = Array.from(modules.values())[0];
        
        const consumerWrapper = module.getProvider(ConsumerService);
        const consumer = consumerWrapper?.instance as ConsumerService;
        
        const result = await consumer.getAsyncData();
        expect(result).toBe('async-data');
    });

    it('should create instance dynamically', async () => {
        @Injectable()
        class DynamicService {
            getValue() {
                return 'dynamic-value';
            }
        }

        @Injectable()
        class FactoryService {
            constructor(private readonly moduleRef: ModuleRef) {}

            createDynamic() {
                return this.moduleRef.create(DynamicService);
            }
        }

        @Module({
            providers: [DynamicService, FactoryService]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const container = app.getContainer();
        const modules = container.getModules();
        const module = Array.from(modules.values())[0];
        
        const factoryWrapper = module.getProvider(FactoryService);
        const factory = factoryWrapper?.instance as FactoryService;
        
        const instance = await factory.createDynamic();
        expect(instance.getValue()).toBe('dynamic-value');
    });
});
