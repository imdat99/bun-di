import { Module, Container, Scope } from './injector';
import { METADATA_KEYS } from './constants';
import { InstanceWrapper } from './injector/instance-wrapper';
import { InjectionToken } from './injector/token';
import { ModuleOptions } from './decorators';
import { Type, DynamicModule, ForwardReference } from './interfaces';
import { Logger } from './services/logger.service';


export class Scanner {
    constructor(private readonly container: Container) { }

    private readonly logger = new Logger('Scanner');

    public async scan(module: Type<any>) {
        // this.logger.log('Scanning modules...');
        await this.scanModule(module);
    }

    private async scanModule(moduleDefinition: Type<any> | DynamicModule, scope: Type<any>[] = []) {
        let moduleClass: Type<any>;
        let dynamicMetadata: Partial<DynamicModule> = {};

        if (moduleDefinition && 'module' in moduleDefinition) {
            moduleClass = (moduleDefinition as DynamicModule).module;
            dynamicMetadata = moduleDefinition as DynamicModule;
        } else {
            moduleClass = moduleDefinition as Type<any>;
        }

        // 1. Check if module already exists
        const token = moduleClass.name; // Simple token strategy
        if (this.container.getModuleByToken(token)) {
            return this.container.getModuleByToken(token);
        }

        // 2. Register Module
        const moduleRef = this.container.addModule(moduleClass, token);

        // Register Module Class itself as a provider (to support DI and Lifecycle hooks)
        const moduleWrapper = new InstanceWrapper({
            token: moduleClass,
            name: moduleClass.name,
            metatype: moduleClass,
            host: moduleRef,
            scope: Scope.DEFAULT,
        });
        this.scanDependencies(moduleWrapper);
        moduleRef.addProvider(moduleWrapper);

        // 3. Get Metadata
        const decoratorOptions = Reflect.getMetadata(METADATA_KEYS.MODULE, moduleClass) as ModuleOptions || {};
        const isGlobal = Reflect.getMetadata(METADATA_KEYS.GLOBAL, moduleClass);
        if (isGlobal) {
            this.container.addGlobalModule(moduleRef);
        }

        // Merge options
        const options: ModuleOptions = {
            ...decoratorOptions,
            ...dynamicMetadata,
            imports: [...(decoratorOptions.imports || []), ...(dynamicMetadata.imports || [])],
            providers: [...(decoratorOptions.providers || []), ...(dynamicMetadata.providers || [])],
            exports: [...(decoratorOptions.exports || []), ...(dynamicMetadata.exports || [])],
            controllers: [...(decoratorOptions.controllers || []), ...(dynamicMetadata.controllers || [])],
        };

        // 4. Register Imports recursively
        if (options.imports) {
            for (const importedModule of options.imports) {
                let actualImport = importedModule;
                // Check if it's a forwardRef
                // Type guard or simple check
                if (importedModule && typeof (importedModule as any).forwardRef === 'function') {
                    actualImport = (importedModule as ForwardReference).forwardRef();
                }

                // Recursively scan
                // Cast actualImport to Type<any> | DynamicModule for scanModule
                const importedRef = await this.scanModule(actualImport as Type<any> | DynamicModule, [...scope, moduleClass]);
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
                // exports can contain Providers or Modules, but addExport expects InjectionToken essentially.
                // We need to extract the token if it is a provider object, or use the class/string/symbol itself.
                // For now, cast to any to fix build, will refine later.
                moduleRef.addExport(exportToken as any);
            }
        }

        return moduleRef;
    }

    private insertProvider(provider: any, moduleRef: Module) {
        const isCustomProvider = provider && !provider.constructor; // Simplistic check, better check for 'provide' key
        // Actually, a class is a function. An object is not.
        const isPlainObject = provider && typeof provider === 'object' && 'provide' in provider;

        if (!isPlainObject) {
            // Standard Class Provider
            const token = provider;
            // Read scope from decorator metadata  
            const providerScope = Reflect.getMetadata(METADATA_KEYS.SCOPE, provider) ?? Scope.DEFAULT;
            const wrapper = new InstanceWrapper({
                token,
                name: token.name,
                metatype: provider,
                host: moduleRef,
                scope: providerScope
            });
            this.scanDependencies(wrapper);
            moduleRef.addProvider(wrapper);
            return;
        }

        // Custom Provider
        const token = provider.provide;
        const wrapper = new InstanceWrapper({
            token,
            name: (token && token.name) ? token.name : (typeof token === 'string' ? token : 'CustomProvider'),
            host: moduleRef,
            scope: provider.scope || Scope.DEFAULT,
        });

        if (provider.useValue !== undefined) {
            wrapper.useValue = provider.useValue;
        } else if (provider.useFactory) {
            wrapper.useFactory = provider.useFactory;
            wrapper.inject = provider.inject || [];
        } else if (provider.useClass) {
            wrapper.metatype = provider.useClass;
            this.scanDependencies(wrapper); // Scan the actual class
        } else if (provider.useExisting) {
            wrapper.useExisting = provider.useExisting;
            wrapper.isAlias = true;
        }

        moduleRef.addProvider(wrapper);
    }

    private insertController(controller: any, moduleRef: Module) {
        const token = controller;
        // Read scope from decorator metadata
        const controllerScope = Reflect.getMetadata(METADATA_KEYS.SCOPE, controller) ?? Scope.DEFAULT;
        const wrapper = new InstanceWrapper({
            token,
            name: token.name,
            metatype: controller,
            host: moduleRef,
            scope: controllerScope
        });
        this.scanDependencies(wrapper);
        moduleRef.addController(wrapper);
    }

    public scanDependencies(wrapper: InstanceWrapper) {
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

        // Property dependencies
        const propertyDeps = Reflect.getMetadata(METADATA_KEYS.PROPERTY_DEPS, wrapper.metatype as any) || [];
        const optionalProps = Reflect.getMetadata(METADATA_KEYS.OPTIONAL, wrapper.metatype as any) || [];

        wrapper.properties = propertyDeps.map((dep: any) => {
            return {
                key: dep.key,
                token: dep.token,
                isOptional: optionalProps.includes(dep.key),
            };
        });
    }
}
