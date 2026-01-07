import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';
import { HonoDiScanner } from '../scanner';
import { Container } from '../injector/container';
import { Module, Injectable, Controller } from '../decorators';
import { HonoDiFactory } from '../factory';

describe('Scanner', () => {
  let container: Container;
  let scanner: HonoDiScanner;

  beforeEach(() => {
    container = new Container();
    scanner = new HonoDiScanner(container);
  });

  test('should scan a simple module with providers', async () => {
    @Injectable()
    class ServiceA {}

    @Module({
      providers: [ServiceA],
    })
    class TestModule {}

    await scanner.scan(TestModule);

    // Verify container state
    const moduleRef = container.getModules().get('TestModule');
    expect(moduleRef).toBeDefined();
    expect(moduleRef?.hasProvider(ServiceA)).toBe(true);
  });

  test('should scan controllers', async () => {
    @Controller('test')
    class TestController {}

    @Module({
      controllers: [TestController],
    })
    class TestModule {}

    await scanner.scan(TestModule);

    const moduleRef = container.getModules().get('TestModule');
    expect(moduleRef).toBeDefined();
    expect(moduleRef?.controllers.has(TestController)).toBe(true);
  });

  test('should scan imported modules', async () => {
    @Injectable()
    class ServiceA {}

    @Module({
      providers: [ServiceA],
      exports: [ServiceA]
    })
    class ModuleA {}

    @Module({
      imports: [ModuleA]
    })
    class ModuleB {}

    await scanner.scan(ModuleB);

    const moduleARef = container.getModules().get('ModuleA');
    const moduleBRef = container.getModules().get('ModuleB');

    expect(moduleARef).toBeDefined();
    expect(moduleBRef).toBeDefined();
    
    // Check module linkage if implemented (usually handled by ModuleRef logic or just existence in container)
    // HonoDi scanner populates imports array in Module
    const imported = Array.from(moduleBRef!.imports);
    expect(imported).toContain(moduleARef!);
  });
});
