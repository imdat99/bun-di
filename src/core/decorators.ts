import 'reflect-metadata';
import { METADATA_KEYS } from './constants';


export enum RequestMethod {
    GET = 'get',
    POST = 'post',
    PUT = 'put',
    DELETE = 'delete',
    PATCH = 'patch',
    ALL = 'all',
    OPTIONS = 'options',
    HEAD = 'head',
}

export interface RouteDefinition {
    path: string;
    requestMethod: RequestMethod;
    methodName: string;
}

export interface ModuleOptions {
    imports?: any[];
    controllers?: any[];
    providers?: any[];
    exports?: any[];
}

export function Module(options: ModuleOptions): ClassDecorator {
    return (target: any) => {
        Reflect.defineMetadata(METADATA_KEYS.MODULE, options, target);
    };
}

export interface InjectableOptions {
    scope?: Scope;
}

import { Scope } from './injector/scope';

export function Injectable(options?: InjectableOptions): ClassDecorator {
    return (target: any) => {
        Reflect.defineMetadata(METADATA_KEYS.SCOPE, options?.scope ?? Scope.DEFAULT, target);
    };
}

export function Controller(prefix: string = ''): ClassDecorator {
    return (target: any) => {
        Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, { prefix }, target);
        // Mark as Injectable implicitly
        Reflect.defineMetadata(METADATA_KEYS.SCOPE, Scope.DEFAULT, target);
    };
}

// Method Decorators
function createRouteDecorator(method: RequestMethod) {
    return (path: string = '/'): MethodDecorator => {
        return (target, propertyKey, descriptor) => {
            // In case of instance method decorator, target is the prototype
            if (!Reflect.hasMetadata(METADATA_KEYS.ROUTES, target.constructor)) {
                Reflect.defineMetadata(METADATA_KEYS.ROUTES, [], target.constructor);
            }

            const routes = Reflect.getMetadata(METADATA_KEYS.ROUTES, target.constructor) as RouteDefinition[];

            routes.push({
                requestMethod: method,
                path,
                methodName: propertyKey as string,
            });
            Reflect.defineMetadata(METADATA_KEYS.ROUTES, routes, target.constructor);
        };
    };
}

export const Get = createRouteDecorator(RequestMethod.GET);
export const Post = createRouteDecorator(RequestMethod.POST);
export const Put = createRouteDecorator(RequestMethod.PUT);
export const Delete = createRouteDecorator(RequestMethod.DELETE);
// Exception Filters
export function Catch(...exceptions: any[]): ClassDecorator {
    return (target: any) => {
        Reflect.defineMetadata(METADATA_KEYS.FILTER_CATCH, exceptions, target);
        // Mark as Injectable implicitly
        Reflect.defineMetadata(METADATA_KEYS.SCOPE, Scope.DEFAULT, target);
    };
}

export function UseFilters(...filters: any[]): MethodDecorator & ClassDecorator {
    return (
        target: any,
        propertyKey?: string | symbol,
        descriptor?: PropertyDescriptor,
    ) => {
        if (descriptor) {
            // Method decorator
            Reflect.defineMetadata(METADATA_KEYS.USE_FILTERS, filters, descriptor.value);
            return descriptor;
        }
        // Class decorator
        Reflect.defineMetadata(METADATA_KEYS.USE_FILTERS, filters, target);
        return target;
    };
}
