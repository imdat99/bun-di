import { InstanceWrapper } from './instance-wrapper';
import { InjectionToken } from './token';
import { Type } from '../interfaces';

export class Module {
    private readonly _providers = new Map<InjectionToken, InstanceWrapper>();
    private readonly _imports = new Set<Module>();
    private readonly _exports = new Set<InjectionToken>();
    private readonly _controllers = new Map<InjectionToken, InstanceWrapper>();

    constructor(
        public readonly metatype: Type<any>,
        public readonly token: string,
    ) { }

    get providers() {
        return this._providers;
    }

    get imports() {
        return this._imports;
    }

    get exports() {
        return this._exports;
    }

    get controllers() {
        return this._controllers;
    }

    public addProvider(provider: InstanceWrapper) {
        this._providers.set(provider.token, provider);
    }

    public addController(controller: InstanceWrapper) {
        this._controllers.set(controller.token, controller);
    }

    public addImport(module: Module) {
        this._imports.add(module);
    }

    public addExport(token: InjectionToken) {
        this._exports.add(token);
    }

    public hasProvider(token: InjectionToken): boolean {
        return this._providers.has(token);
    }

    public getProvider(token: InjectionToken): InstanceWrapper | undefined {
        return this._providers.get(token);
    }
}
