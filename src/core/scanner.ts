import { Container } from './injector/container';
import { Module } from './injector/module';
import { METADATA_KEYS } from './constants';
import { InstanceWrapper } from './injector/instance-wrapper';
import { InjectionToken } from './injector/token';
import { Scope } from './injector/scope';
import { ModuleOptions } from './decorators';
import { Type } from './interfaces';


export class NestScanner {
    constructor(private readonly container: Container) { }

    public async scan(module: Type<any>) {
        await this.scanModule(module);
    }

    private async scanModule(moduleClass: Type<any>, scope: Type<any>[] = []) {
        // 1. Check if module already exists
        const token = moduleClass.name; // Simple token strategy
        if (this.container.getModuleByToken(token)) {
            return this.container.getModuleByToken(token);
        }

        // 2. Register Module
        const moduleRef = this.container.addModule(moduleClass, token);

        // 3. Get Metadata
        const options = Reflect.getMetadata(METADATA_KEYS.MODULE, moduleClass) as ModuleOptions;
        if (!options) {
            return moduleRef;
        }

        // 4. Register Imports recursively
        if (options.imports) {
            for (const importedModule of options.imports) {
                // Check if it's a dynamic module (not supported yet, assuming class)
                // If it's a forwardRef, it might be a function
                let actualImport = importedModule;
                // TODO: Handle forwardRef()

                const importedRef = await this.scanModule(actualImport, [...scope, moduleClass]);
                if (importedRef) {
                    moduleRef.addImport(importedRef);
                }
            }
        }

        // 5. Register Providers
        if (options.providers) {
            for (const provider of options.providers) {
                this.insertProvider(provider, moduleRef);
            }
        }

        // 6. Register Controllers
        if (options.controllers) {
            for (const controller of options.controllers) {
                this.insertController(controller, moduleRef);
            }
        }

        // 7. Register Exports
        if (options.exports) {
            for (const exportToken of options.exports) {
                // Only add token to exports
                moduleRef.addExport(exportToken);
            }
        }

        return moduleRef;
    }

    private insertProvider(provider: any, moduleRef: Module) {
        // Handle ClassProvider, ValueProvider, FactoryProvider
        // For now assume ClassProvider (standard service class)
        const token = provider;
        // Metadata scan for scope
        // const scope = Reflect.getMetadata(METADATA_KEYS.SCOPE, provider) || Scope.DEFAULT;

        const wrapper = new InstanceWrapper({
            token,
            name: token.name,
            metatype: provider,
            host: moduleRef,
            scope: Scope.DEFAULT // Default to Singleton if not specified
        });
        // Scan constructor params?
        this.scanDependencies(wrapper);

        moduleRef.addProvider(wrapper);
    }

    private insertController(controller: any, moduleRef: Module) {
        const token = controller;
        const wrapper = new InstanceWrapper({
            token,
            name: token.name,
            metatype: controller,
            host: moduleRef,
            scope: Scope.DEFAULT
        });
        this.scanDependencies(wrapper);
        moduleRef.addController(wrapper);
    }

    private scanDependencies(wrapper: InstanceWrapper) {
        // Use reflect-metadata to get constructor param types
        const paramTypes = Reflect.getMetadata('design:paramtypes', wrapper.metatype as any) || [];
        const injections = Reflect.getMetadata(METADATA_KEYS.INJECTIONS, wrapper.metatype as any) || [];
        const optionals = Reflect.getMetadata(METADATA_KEYS.OPTIONAL, wrapper.metatype as any) || [];

        // Fallback logic: @Inject(token) ?? design:paramtypes[index]
        const mergedInject = [];
        const mergedOptional = [];

        for (let i = 0; i < paramTypes.length; i++) {
            mergedInject[i] = injections[i] || paramTypes[i];
            mergedOptional[i] = optionals[i] || false;
        }

        wrapper.inject = mergedInject;
        wrapper.isOptional = mergedOptional;
    }
}
