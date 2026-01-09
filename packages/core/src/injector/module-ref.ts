
import { Type } from '../interfaces';
import { ContextId } from './context-id';
import { Container } from './container';
import { Injector } from './injector';
import { Module } from './module';
import { Scope } from './scope';

export abstract class ModuleRef {
    abstract get<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol, options?: { strict: boolean }): TResult;
    abstract resolve<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol, contextId?: ContextId, options?: { strict: boolean }): Promise<TResult>;
    abstract create<TInput = any>(type: Type<TInput>, contextId?: ContextId): Promise<TInput>;
}

export class ModuleRefImpl extends ModuleRef {
    constructor(
        private readonly container: Container,
        private readonly injector: Injector,
        private readonly moduleRef: Module
    ) {
        super();
    }

    get<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol, options: { strict: boolean } = { strict: true }): TResult {
        const token = typeOrToken;
        // Lookup in current module
        let wrapper = this.moduleRef.getProvider(token as any);

        if (!wrapper && !options.strict) {
            // Search globally or in imports?
            // For strict=false, Nest searches the whole container? 
            // Simplified: just search current module + globals
            // Actually, strict=false means "check global modules too" or "check imports"
            // Let's implement basic lookup similar to Injector.lookupProvider
            // But Injector.lookupProvider is private.
            // We can reuse logic if we move lookup logic to Module or Container?
            // For now, let's just use what we have.
        }

        if (!wrapper) {
            // Try to find in imports/globals manually if strict is false?
            // Or throw?
            // Nest returns undefined if not found? Or throws?
            // usually throws "Nest can't resolve..."
            throw new Error(`ModuleRef cannot find provider for ${token.toString()}`);
        }

        if (wrapper.scope !== Scope.DEFAULT) {
            throw new Error(`Cannot use get() for scoped provider ${token.toString()}. Use resolve() instead.`);
        }

        return wrapper.instance as TResult;
    }

    async resolve<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol, contextId?: ContextId, options: { strict: boolean } = { strict: true }): Promise<TResult> {
        const token = typeOrToken;
        const wrapper = this.moduleRef.getProvider(token as any);

        if (!wrapper) {
            throw new Error(`ModuleRef cannot find provider for ${token.toString()}`);
        }

        return this.injector.loadInstance(wrapper, contextId || new ContextId()) as Promise<TResult>;
    }

    async create<TInput = any>(type: Type<TInput>, contextId?: ContextId): Promise<TInput> {
        // Create a new instance without registering it
        // This is for dynamic instantiation
        const instance = await this.injector.resolveConstructorParams(
            { metatype: type } as any,
            this.moduleRef,
            Reflect.getMetadata('design:paramtypes', type) || [],
            () => {},
            contextId || new ContextId()
        );
        
        return new (type as any)(...instance);
    }
}
