import { Type } from '../interfaces';
import { ContextId } from './context-id';
import { Module } from './module';
import { Scope } from './scope';
import { InjectionToken } from './token';

export class InstanceWrapper<T = any> {
    public readonly id: string;
    public readonly token: InjectionToken;
    public readonly name?: string;
    public metatype?: Type<T> | Function;
    public scope: Scope = Scope.DEFAULT;
    public host?: Module; // Generic logic
    public inject?: InjectionToken[];
    public isOptional?: boolean[];
    public properties?: { key: string | symbol; token: InjectionToken; isOptional?: boolean }[];


    public instance?: T; // Singleton instance
    private readonly instancesPerContext = new Map<ContextId, T>();

    public isResolved = false;
    public isPending = false; // For circular dependency detection

    public isAlias = false;
    public useFactory?: Function;
    public useValue?: any;
    public useExisting?: any;

    constructor(metadata: Partial<InstanceWrapper<T>> & { token: InjectionToken }) {
        this.token = metadata.token;
        this.name = metadata.name;
        this.metatype = metadata.metatype;
        this.scope = metadata.scope ?? Scope.DEFAULT;
        this.host = metadata.host;
        this.instance = metadata.instance;
        this.inject = metadata.inject;
        this.useFactory = metadata.useFactory;
        this.useValue = metadata.useValue;
        this.useExisting = metadata.useExisting;
        this.isAlias = !!metadata.useExisting;
        this.isOptional = metadata.isOptional;
        this.id = Math.random().toString(36).substring(7); // Simple ID for now
    }

    public getInstanceByContextId(contextId: ContextId): T | undefined {
        if (this.scope === Scope.TRANSIENT) {
            return undefined; // Transient always new
        }
        if (this.scope === Scope.DEFAULT) {
            return this.instance;
        }
        return this.instancesPerContext.get(contextId);
    }

    public setInstanceByContextId(contextId: ContextId, instance: T) {
        if (this.scope === Scope.DEFAULT) {
            this.instance = instance;
        } else if (this.scope === Scope.REQUEST) {
            this.instancesPerContext.set(contextId, instance);
        }
    }

    public addCtorMetadata(index: number, token: InjectionToken) {
        if (!this.inject) {
            this.inject = [];
        }
        this.inject[index] = token;
    }

    public cleanup(contextId?: ContextId) {
        if (contextId) {
            // Cleanup specific context
            this.instancesPerContext.delete(contextId);
        } else {
            // Cleanup all request-scoped instances
            this.instancesPerContext.clear();
        }
    }
}
