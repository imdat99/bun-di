import 'reflect-metadata';
import { Hono, Context, Next } from 'hono';
import { Observable, from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Container } from './injector/container';
import { HonoDiScanner } from './scanner';
import { Injector } from './injector/injector';
import { METADATA_KEYS } from './constants';
import { RouteDefinition, RouteParamtypes, RequestMethod } from './decorators';
import { ContextId } from './injector/context-id';
import { Scope } from './injector/scope';
import { ExecutionContextHost } from './execution-context-host';
import { InstanceWrapper } from './injector/instance-wrapper';
import { Type, IApplication } from './interfaces';
import { HonoDiApplication } from './application';
import { MiddlewareBuilder } from './middleware/builder';
import { HttpException } from './common/exceptions';
import { StatusCode } from 'hono/utils/http-status';
import { Logger } from './services/logger.service';

export class HonoDiFactory {
    private static logger = new Logger('HonoDiFactory');

    public static async create(rootModule: any, appOrOptions?: Hono | { app?: Hono, autoInit?: boolean }): Promise<IApplication> {
        let app: Hono | undefined;
        let autoInit = true;

        if (appOrOptions && 'fetch' in appOrOptions && typeof appOrOptions.fetch === 'function') {
             // Basic duck typing for Hono instance or instanceof check if imported
             app = appOrOptions as Hono;
        } else if (appOrOptions) {
            const options = appOrOptions as { app?: Hono, autoInit?: boolean };
            app = options.app;
            if (options.autoInit !== undefined) {
                autoInit = options.autoInit;
            }
        }

        const container = new Container();
        const scanner = new HonoDiScanner(container);
        const injector = new Injector(container);
        const honoApp = app || new Hono();
        const bunApp = new HonoDiApplication(honoApp, container, injector);

        // 1. Scan and Build Graph
        this.logger.log('Scanning modules...');
        await scanner.scan(rootModule);

        // 2. Instantiate Global Singletons
        this.logger.log('Instantiating providers...');
        await this.instantiateProviders(container, injector);

        // 3. Call OnModuleInit
        this.logger.log('Calling OnModuleInit...');
        await this.callLifecycleHook('onModuleInit', container);

        if (autoInit) {
            await bunApp.init();
        }

        return bunApp;
    }

    private static async instantiateProviders(container: Container, injector: Injector) {
        const modules = container.getModules();
        const globalContextId = new ContextId();
        for (const module of modules.values()) {
            for (const wrapper of module.providers.values()) {
                if (wrapper.scope === Scope.DEFAULT) {
                    await injector.loadInstance(wrapper, globalContextId);
                }
            }
            for (const wrapper of module.controllers.values()) {
                if (wrapper.scope === Scope.DEFAULT) {
                    await injector.loadInstance(wrapper, globalContextId);
                }
            }
        }
    }

    private static async callLifecycleHook(hook: string, container: Container) {
        const modules = container.getModules();
        for (const module of modules.values()) {
            for (const wrapper of module.providers.values()) {
                if (wrapper.instance && (wrapper.instance as any)[hook]) {
                    await (wrapper.instance as any)[hook]();
                }
            }
            for (const wrapper of module.controllers.values()) {
                if (wrapper.instance && (wrapper.instance as any)[hook]) {
                    await (wrapper.instance as any)[hook]();
                }
            }
        }
    }
}
