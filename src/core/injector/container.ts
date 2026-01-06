import { Module } from './module';
import { InjectionToken } from './token';
import { Type } from '../interfaces';

export class Container {
    private readonly modules = new Map<string, Module>();
    // Map internal tokens (module class hash/name) to Module instances

    public addModule(moduleMeta: Type<any>, token: string): Module {
        if (!this.modules.has(token)) {
            const module = new Module(moduleMeta, token);
            this.modules.set(token, module);
            return module;
        }
        return this.modules.get(token)!;
    }

    public getModuleByToken(token: string): Module | undefined {
        return this.modules.get(token);
    }

    public getModules(): Map<string, Module> {
        return this.modules;
    }
}
