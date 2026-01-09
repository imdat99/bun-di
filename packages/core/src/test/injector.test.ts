import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';
import { Injector } from '../injector/injector';
import { Container } from '../injector/container';
import { Module } from '../injector/module';
import { Scope } from '../injector/scope';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Injectable, Inject, Optional, Scope as ScopeDecorator } from '../decorators';
import { InjectionToken } from '../injector/token';
import { ContextId } from '../injector/context-id';

describe('Injector', () => {
  let container: Container;
  let injector: Injector;
  let module: Module;

  beforeEach(() => {
    container = new Container();
    injector = new Injector(container);
    module = new Module(class TestModule { }, 'TestModule');
    container.addModule(class TestModule { }, 'TestModule');
  });

  test('should resolve a simple class instance', async () => {
    @Injectable()
    class ServiceA { }

    const wrapper = new InstanceWrapper({
      name: 'ServiceA',
      metatype: ServiceA,
      token: ServiceA,
      isResolved: false
    });
    module.addProvider(wrapper);
    wrapper.host = module;

    const instance = await injector.loadInstance(wrapper, new ContextId());
    expect(instance).toBeInstanceOf(ServiceA);
  });

  test('should resolve class with dependencies', async () => {
    @Injectable()
    class ServiceA { }

    @Injectable()
    class ServiceB {
      constructor(public serviceA: ServiceA) { }
    }

    const wrapperA = new InstanceWrapper({ name: 'ServiceA', metatype: ServiceA, token: ServiceA });
    const wrapperB = new InstanceWrapper({
      name: 'ServiceB',
      metatype: ServiceB,
      token: ServiceB,
      inject: [ServiceA]
    });

    // Simulate scanner linking dependencies
    // In a real scan, 'inject' array is populated. 
    // Here we manually populate it or let Injector resolve via Reflect if we set it up right,
    // but Injector.loadInstance relies on 'wrapper.inject' OR scanning logic.
    // Looking at Injector code: line 191 `let dependencies = wrapper.inject || [];`
    // It doesn't auto-read metadata inside loadInstance usually, verify logic.
    // Line 189 comment says "If inject is undefined, try to retrieve from metadata".
    // But implementation just uses `wrapper.inject || []`.
    // Wait, let's re-read Injector L191.

    module.addProvider(wrapperA);
    wrapperA.host = module;
    module.addProvider(wrapperB);
    wrapperB.host = module;

    const instanceB = await injector.loadInstance(wrapperB, new ContextId());
    expect(instanceB).toBeInstanceOf(ServiceB);
    expect(instanceB.serviceA).toBeInstanceOf(ServiceA);
  });

  test('should resolve useValue provider', async () => {
    const token = 'CONFIG';
    const value = { port: 3000 };

    const wrapper = new InstanceWrapper({
      name: 'Config',
      token: token,
      useValue: value
    });
    module.addProvider(wrapper);
    wrapper.host = module;

    const instance = await injector.loadInstance(wrapper, new ContextId());
    expect(instance).toEqual(value);
  });

  test('should resolve useFactory provider', async () => {
    @Injectable()
    class ServiceA {
      value = 10;
    }

    const token = 'FACTORY_VALUE';
    const wrapperA = new InstanceWrapper({ name: 'ServiceA', metatype: ServiceA, token: ServiceA });
    const wrapperFactory = new InstanceWrapper({
      name: 'Factory',
      token: token,
      inject: [ServiceA],
      useFactory: (serviceA: ServiceA) => serviceA.value * 2
    });

    module.addProvider(wrapperA);
    wrapperA.host = module;
    module.addProvider(wrapperFactory);
    wrapperFactory.host = module;

    const instance = await injector.loadInstance(wrapperFactory, new ContextId());
    expect(instance).toBe(20);
  });

  test('should handle singleton scope (DEFAULT)', async () => {
    @Injectable()
    class ServiceA { }

    const wrapper = new InstanceWrapper({
      name: 'ServiceA',
      metatype: ServiceA,
      token: ServiceA,
      scope: Scope.DEFAULT
    });
    module.addProvider(wrapper);
    wrapper.host = module;

    const instance1 = await injector.loadInstance(wrapper, new ContextId());
    const instance2 = await injector.loadInstance(wrapper, new ContextId());

    expect(instance1).toBe(instance2);
  });

  test('should handle request scope', async () => {
    @Injectable({ scope: Scope.REQUEST })
    class ServiceA { }

    const wrapper = new InstanceWrapper({
      name: 'ServiceA',
      metatype: ServiceA,
      token: ServiceA,
      scope: Scope.REQUEST
    });
    module.addProvider(wrapper);
    wrapper.host = module;

    // Same context ID -> same instance
    const id1 = new ContextId();
    const instance1a = await injector.loadInstance(wrapper, id1);
    const instance1b = await injector.loadInstance(wrapper, id1);
    expect(instance1a).toBe(instance1b);

    // Different context ID -> different instance
    const id2 = new ContextId();
    const instance2 = await injector.loadInstance(wrapper, id2);
    expect(instance1a).not.toBe(instance2);
  });

  test('should handle optional dependencies', async () => {
    @Injectable()
    class ServiceB {
      constructor(@Optional() @Inject('MISSING') public missing: any) { }
    }

    // wrapper needs to know it's optional. 
    // In Nest/HonoDi, the scanner usually determines isOptional array in wrapper.
    const wrapper = new InstanceWrapper({
      name: 'ServiceB',
      metatype: ServiceB,
      token: ServiceB,
      inject: ['MISSING'],
      isOptional: [true]
    });
    module.addProvider(wrapper);
    wrapper.host = module;

    const instance = await injector.loadInstance(wrapper, new ContextId());
    expect(instance).toBeInstanceOf(ServiceB);
    expect(instance.missing).toBeUndefined();
  });

  test('should generate UUID for ContextId', () => {
    const ctx1 = new ContextId();
    const ctx2 = new ContextId();

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(ctx1.id)).toBe(true);
    expect(uuidRegex.test(ctx2.id)).toBe(true);

    // UUIDs should be unique
    expect(ctx1.id).not.toBe(ctx2.id);
  });

  test('should cleanup request-scoped instances', async () => {
    @Injectable({ scope: Scope.REQUEST })
    class ServiceA { }

    const wrapper = new InstanceWrapper({
      name: 'ServiceA',
      metatype: ServiceA,
      token: ServiceA,
      scope: Scope.REQUEST
    });
    module.addProvider(wrapper);
    wrapper.host = module;

    const { ContextId } = require('../injector/context-id');
    const ctx1 = new ContextId();
    const ctx2 = new ContextId();

    const instance1 = await injector.loadInstance(wrapper, ctx1);
    const instance2 = await injector.loadInstance(wrapper, ctx2);

    // Different instances for different contexts
    expect(instance1).not.toBe(instance2);

    // Cleanup specific context
    wrapper.cleanup(ctx1);

    // Re-resolve should create new instance
    const instance1New = await injector.loadInstance(wrapper, ctx1);
    expect(instance1New).not.toBe(instance1);

    // ctx2 instance should still be cached
    const instance2Again = await injector.loadInstance(wrapper, ctx2);
    expect(instance2Again).toBe(instance2);
  });

  test('should cleanup all contexts when called without contextId', async () => {
    @Injectable({ scope: Scope.REQUEST })
    class ServiceA { }

    const wrapper = new InstanceWrapper({
      name: 'ServiceA',
      metatype: ServiceA,
      token: ServiceA,
      scope: Scope.REQUEST
    });
    module.addProvider(wrapper);
    wrapper.host = module;

    const { ContextId } = require('../injector/context-id');
    const ctx1 = new ContextId();
    const ctx2 = new ContextId();

    const instance1 = await injector.loadInstance(wrapper, ctx1);
    const instance2 = await injector.loadInstance(wrapper, ctx2);

    // Cleanup all
    wrapper.cleanup();

    // Both should be re-created
    const instance1New = await injector.loadInstance(wrapper, ctx1);
    const instance2New = await injector.loadInstance(wrapper, ctx2);

    expect(instance1New).not.toBe(instance1);
    expect(instance2New).not.toBe(instance2);
  });
});
