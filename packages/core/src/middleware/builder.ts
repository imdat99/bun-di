
import { MiddlewareConsumer, MiddlewareConfigProxy, Type, RouteInfo } from '../interfaces';
import { RequestMethod } from '../decorators';

import { Module } from '../injector/module';

export class MiddlewareBuilder implements MiddlewareConsumer {
    private readonly configs: MiddlewareConfig[] = [];

    constructor(private readonly module?: Module) { }

    apply(...middleware: (Type<any> | Function)[]): MiddlewareConfigProxy {
        return new MiddlewareConfigProxyImpl(this, middleware);
    }

    addConfig(middleware: any[], routes: (string | Type<any> | RouteInfo)[], excludes: (string | RouteInfo)[] = []) {
        this.configs.push({
            middleware,
            routes,
            excludes,
            module: this.module
        });
    }

    getConfigs() {
        return this.configs;
    }
}

class MiddlewareConfigProxyImpl implements MiddlewareConfigProxy {
    private excludes: (string | RouteInfo)[] = [];

    constructor(private builder: MiddlewareBuilder, private middleware: any[]) { }

    exclude(...routes: (string | RouteInfo)[]): MiddlewareConfigProxy {
        this.excludes = routes;
        return this;
    }

    forRoutes(...routes: (string | Type<any> | RouteInfo)[]): MiddlewareConsumer {
        this.builder.addConfig(this.middleware, routes, this.excludes);
        return this.builder;
    }
}

export interface MiddlewareConfig {
    middleware: any[];
    routes: (string | Type<any> | RouteInfo)[];
    excludes: (string | RouteInfo)[];
    module?: Module;
}
