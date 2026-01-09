import { Container } from './container';
import { InstanceWrapper } from './instance-wrapper';
import { Module } from './module';
import { InjectionToken } from './token';
import { ContextId } from './context-id';
import { Scope } from './scope';
import { METADATA_KEYS } from '../constants';
import { ModuleRef, ModuleRefImpl } from './module-ref';

export class Injector {
    constructor(private readonly container?: Container) { }

    public async resolveConstructorParams<T>(
        wrapper: InstanceWrapper<T>,
        module: Module,
        inject: InjectionToken[],
        callback: (args: any[]) => void, // not used directly in this async flow but kept for structure if needed
        contextId = new ContextId(),
        inquire: InstanceWrapper[] = [],
        parentInquire: InstanceWrapper[] = []
    ) {
        // Check circular dependencies for ALL scopes
        if (inquire.some((item) => item === wrapper)) {
            // Build dependency chain for better error message
            const chain = [...inquire, wrapper].map(w => w.name || 'Unknown').join(' -> ');
            throw new Error(`Circular dependency detected: ${chain}`);
        }


        const args: any[] = [];

        // Resolve each dependency
        for (const [index, token] of inject.entries()) {
            const isOptional = wrapper.isOptional ? wrapper.isOptional[index] : false;
            const paramWrapper = await this.resolveSingleParam(token, module, contextId, [...inquire, wrapper], isOptional);
            args.push(paramWrapper);
        }

        return args;
    }

    public async resolveSingleParam<T>(
        token: InjectionToken,
        targetModule: Module,
        contextId: ContextId,
        inquire: InstanceWrapper[],
        isOptional: boolean = false
    ): Promise<T | undefined> {
        let isForwardRef = false;
        // Unwrap forwardRef
        if (token && (token as any).forwardRef) {
            token = (token as any).forwardRef();
            isForwardRef = true;
        }

        if (token === ModuleRef) {
            return new ModuleRefImpl(this.container!, this, targetModule) as any;
        }

        // 1. Resolve Provider Wrapper
        const wrapper = this.lookupProvider(token, targetModule);

        if (!wrapper) {
            if (isOptional) {
                return undefined;
            }
            throw new Error(`HonoDi can't resolve dependencies of the ${targetModule.metatype.name} (??). Please make sure that the argument "${token.toString()}" at index [?] is available in the ${targetModule.metatype.name} context.`);
        }

        if (isForwardRef) {
            // Return Proxy
            return new Proxy({}, {
                get: (target, prop) => {
                    if (prop === 'then') return undefined;
                    if (!wrapper.instance) {
                        // console.warn(`Accessing forwardRef dependency ${wrapper.name} before instantiation`);
                    }
                    return (wrapper.instance as any)?.[prop];
                }
            }) as any;
        }

        // 2. Resolve Instance
        return this.loadInstance(wrapper, contextId, inquire);
    }

    private lookupProvider(token: InjectionToken, module: Module): InstanceWrapper | undefined {
        // Performance: Single Map lookup instead of has() + get()
        let wrapper = module.getProvider(token);
        if (wrapper) return wrapper;

        // Check imports - only if exported
        for (const importedModule of module.imports) {
            if (importedModule.exports.has(token)) {
                wrapper = importedModule.getProvider(token);
                if (wrapper) {
                    return wrapper;
                }
                // Re-export: Check nested imports recursively
                const nestedWrapper = this.lookupProvider(token, importedModule);
                if (nestedWrapper) return nestedWrapper;
            }
        }

        // Check global modules
        if (this.container) {
            for (const globalModule of this.container.getGlobalModules()) {
                if (globalModule === module) continue; // Skip self
                
                if (globalModule.exports.has(token)) {
                    wrapper = globalModule.getProvider(token);
                    if (wrapper) {
                        return wrapper;
                    }
                    // Re-export from global module
                    const nestedWrapper = this.lookupProvider(token, globalModule);
                    if (nestedWrapper) return nestedWrapper;
                }
            }
        }

        return undefined;
    }

    public async loadInstance<T>(
        wrapper: InstanceWrapper<T>,
        contextId: ContextId,
        inquire: InstanceWrapper[] = []
    ): Promise<T> {
        if (wrapper.isResolved && wrapper.scope === Scope.DEFAULT) {
            return wrapper.instance as T;
        }

        if (wrapper.scope === Scope.REQUEST) {
            const existing = wrapper.getInstanceByContextId(contextId);
            if (existing) return existing;
        }

        // Handle Aliases (useExisting)
        if (wrapper.isAlias) {
            const targetToken = wrapper.useExisting;
            const instance = await this.resolveSingleParam<T>(targetToken, wrapper.host!, contextId, inquire);
            if (wrapper.scope === Scope.DEFAULT) {
                wrapper.instance = instance;
                wrapper.isResolved = true;
            } else {
                wrapper.setInstanceByContextId(contextId, instance!);
            }
            return instance!;
        }

        // Handle Value Provider
        if (wrapper.useValue !== undefined) {
            wrapper.instance = wrapper.useValue;
            wrapper.isResolved = true;
            return wrapper.instance as T;
        }

        // Handle Factory Provider
        if (wrapper.useFactory) {
            const dependencies = wrapper.inject || [];
            const args = await this.resolveConstructorParams(
                wrapper,
                wrapper.host!,
                dependencies,
                (args) => { },
                contextId,
                inquire
            );
            const instance = await wrapper.useFactory(...args);

            if (wrapper.scope === Scope.DEFAULT) {
                wrapper.instance = instance;
                wrapper.isResolved = true;
            } else {
                wrapper.setInstanceByContextId(contextId, instance);
            }
            return instance as T;
        }

        // Class Provider (Standard)
        const { metatype } = wrapper;
        if (!metatype || typeof metatype !== 'function') {
            throw new Error('Invalid metatype');
        }

        // Resolve dependencies
        // If inject is undefined, try to retrieve from metadata (design:paramtypes)
        // Note: This merging logic should ideally happen during scanning
        let dependencies = wrapper.inject || [];

        const constructorArgs = await this.resolveConstructorParams(
            wrapper,
            wrapper.host!,
            dependencies,
            (args) => { },
            contextId,
            inquire
        );

        const instance = new (metatype as any)(...constructorArgs);

        // Resolve Property Dependencies
        if (wrapper.properties) {
            const UNSAFE_KEYS = ['__proto__', 'constructor', 'prototype'];
            for (const prop of wrapper.properties) {
                // Security: Prevent prototype pollution
                // Check if key is a string that matches unsafe patterns
                if (typeof prop.key === 'string' && UNSAFE_KEYS.includes(prop.key)) {
                    throw new Error(`Unsafe property injection detected: ${prop.key}`);
                }
                // Also check string representation for symbol keys (though symbols are generally safe)
                // Symbol keys won't match the UNSAFE_KEYS, but we validate string keys explicitly

                const propInstance = await this.resolveSingleParam(
                    prop.token,
                    wrapper.host!,
                    contextId,
                    inquire,
                    prop.isOptional
                );
                if (propInstance !== undefined) {
                    (instance as any)[prop.key] = propInstance;
                }
            }
        }


        // Cache instance
        if (wrapper.scope === Scope.DEFAULT) {
            wrapper.instance = instance;
            wrapper.isResolved = true;
        } else {
            wrapper.setInstanceByContextId(contextId, instance);
        }

        return instance as T;
    }
}
