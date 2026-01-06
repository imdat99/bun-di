import { Module } from './module';
import { InjectionToken } from './token';
import { Type } from '../interfaces';

export class Container {
    private readonly modules = new Map<string, Module>();
    private readonly globalModules = new Set<Module>();

    public addModule(moduleMeta: Type<any>, token: string): Module {
        if (!this.modules.has(token)) {
            const module = new Module(moduleMeta, token);
            this.modules.set(token, module);
            return module;
        }
        return this.modules.get(token)!;
    }

    public addGlobalModule(module: Module) {
        this.globalModules.add(module);
    }

    public getGlobalModules(): Set<Module> {
        return this.globalModules;
    }

    public getModuleByToken(token: string): Module | undefined {
        return this.modules.get(token);
    }

    public getModules(): Map<string, Module> {
        return this.modules;
    }
}
