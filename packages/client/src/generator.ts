import { Project, ClassDeclaration, MethodDeclaration, Decorator } from 'ts-morph';
import * as path from 'path';

export interface GeneratorOptions {
    tsConfigFilePath: string;
    output?: string;
}

export class TypeGenerator {
    constructor(private readonly options: GeneratorOptions) { }

    async generate(): Promise<string> {
        const project = new Project({
            tsConfigFilePath: this.options.tsConfigFilePath,
        });

        const controllers = this.findControllers(project);
        const routes = this.extractRoutes(controllers, project);

        return this.buildTypeDefinition(routes);
    }

    private findControllers(project: Project): ClassDeclaration[] {
        const controllers: ClassDeclaration[] = [];
        const sourceFiles = project.getSourceFiles();

        for (const sourceFile of sourceFiles) {
            const classes = sourceFile.getClasses();
            for (const cls of classes) {
                if (this.hasDecorator(cls, 'Controller')) {
                    controllers.push(cls);
                }
            }
        }
        return controllers;
    }

    private extractRoutes(controllers: ClassDeclaration[], project: Project) {
        const routes: any[] = [];

        for (const controller of controllers) {
            const controllerPrefix = this.getDecoratorArgument(controller, 'Controller') || '';
            const methods = controller.getMethods();

            for (const method of methods) {
                const methodDecorator = this.getMethodDecorator(method);
                if (methodDecorator) {
                    const methodPath = this.getDecoratorArgument(method, methodDecorator.getName()) || '/';
                    const httpMethod = methodDecorator.getName().toLowerCase(); // Get, Post -> get, post
                    const returnType = method.getReturnType().getText();

                    // Normalize path
                    const fullPath = this.normalizePath(controllerPrefix, methodPath);

                    // Collect return type
                    this.collectType(returnType, project);

                    routes.push({
                        path: fullPath,
                        method: httpMethod,
                        returnType,
                        methodName: method.getName(),
                        parameters: method.getParameters().map(p => {
                            const typeText = p.getType().getText();
                            this.collectType(typeText, project);
                            return {
                                name: p.getName(),
                                type: typeText,
                                decorators: p.getDecorators().map(d => ({
                                    name: d.getName(),
                                    arguments: d.getArguments().map(arg => arg.getText().replace(/^['"]|['"]$/g, ''))
                                }))
                            };
                        })
                    });
                }
            }
        }
        return routes;
    }

    private extraTypes = new Map<string, string>();

    private collectType(typeText: string, project: Project) {
        // Simple heuristic: if it starts with uppercase and is not a primitive
        const primitives = ['string', 'number', 'boolean', 'any', 'void', 'null', 'undefined', 'Date'];
        const isArray = typeText.endsWith('[]');
        const baseType = isArray ? typeText.slice(0, -2) : typeText;

        if (primitives.includes(baseType) || baseType.startsWith('{') || baseType.includes('<')) {
            return;
        }

        if (this.extraTypes.has(baseType)) {
            return;
        }

        // Find the class or interface in the project
        for (const sourceFile of project.getSourceFiles()) {
            const cls = sourceFile.getClass(baseType);
            if (cls) {
                const properties = cls.getProperties().map(p => {
                    return `${p.getName()}: ${p.getType().getText()};`;
                });
                this.extraTypes.set(baseType, `export interface ${baseType} {\n  ${properties.join('\n  ')}\n}`);
                return;
            }

            const intf = sourceFile.getInterface(baseType);
            if (intf) {
                const properties = intf.getProperties().map(p => {
                    return `${p.getName()}: ${p.getType().getText()};`;
                });
                this.extraTypes.set(baseType, `export interface ${baseType} {\n  ${properties.join('\n  ')}\n}`);
                return;
            }
        }
    }

    private buildTypeDefinition(routes: any[]): string {
        let typeDef = `import { Hono } from 'hono';\n`;
        typeDef += `import type { InferRequestType, InferResponseType } from 'hono/client';\n\n`;

        // Add extra types
        for (const [name, def] of this.extraTypes) {
            typeDef += `${def}\n\n`;
        }

        typeDef += `export type AppType = Hono<any, {\n`;

        // Group routes by path
        const routesByPath: Record<string, any[]> = {};
        for (const route of routes) {
            if (!routesByPath[route.path]) {
                routesByPath[route.path] = [];
            }
            routesByPath[route.path].push(route);
        }

        for (const [path, pathRoutes] of Object.entries(routesByPath)) {
            typeDef += `  '${path}': {\n`;
            for (const route of pathRoutes) {
                let inputType = '';
                const inputFields: string[] = [];

                // Handle Body
                const bodyParam = route.parameters.find((p: any) => p.decorators.some((d: any) => d.name === 'Body'));
                if (bodyParam) {
                    inputFields.push(`json: ${bodyParam.type}`);
                }

                // Handle Query
                const queryParam = route.parameters.find((p: any) => p.decorators.some((d: any) => d.name === 'Query'));
                if (queryParam) {
                    inputFields.push(`query: ${queryParam.type}`);
                }

                // Handle Param
                const paramParams = route.parameters.filter((p: any) => p.decorators.some((d: any) => d.name === 'Param'));
                if (paramParams.length > 0) {
                    const paramFields = paramParams.map((p: any) => {
                        const decorator = p.decorators.find((d: any) => d.name === 'Param');
                        const paramName = decorator.arguments[0] || p.name;
                        return `${paramName}: ${p.type}`;
                    });
                    inputFields.push(`param: { ${paramFields.join('; ')} }`);
                }

                inputType = `{ ${inputFields.join(', ')} }`;

                typeDef += `    $${route.method}: {\n`;
                typeDef += `      input: ${inputType},\n`;
                typeDef += `      output: { json: ${route.returnType} },\n`;
                typeDef += `      outputFormat: 'json',\n`;
                typeDef += `      status: 200\n`;
                typeDef += `    },\n`;
            }
            typeDef += `  },\n`;
        }

        typeDef += `}>;\n`;
        return typeDef;
    }

    private hasDecorator(node: ClassDeclaration | MethodDeclaration, name: string): boolean {
        return node.getDecorators().some(d => d.getName() === name);
    }

    private getMethodDecorator(method: MethodDeclaration): Decorator | undefined {
        const methods = ['Get', 'Post', 'Put', 'Delete', 'Patch'];
        return method.getDecorators().find(d => methods.includes(d.getName()));
    }

    private getDecoratorArgument(node: ClassDeclaration | MethodDeclaration, name: string): string | undefined {
        const decorator = node.getDecorator(name);
        if (!decorator) return undefined;
        const args = decorator.getArguments();
        if (args.length > 0) {
            const text = args[0].getText();
            // Remove quotes
            return text.replace(/^['"]|['"]$/g, '');
        }
        return undefined;
    }

    private normalizePath(prefix: string, path: string): string {
        const cleanPrefix = prefix ? prefix.replace(/^\/+/, '').replace(/\/+$/, '') : '';
        const cleanPath = path ? path.replace(/^\/+/, '').replace(/\/+$/, '') : '';
        let result = '';
        if (cleanPrefix) result += `/${cleanPrefix}`;
        if (cleanPath) result += `/${cleanPath}`;
        return result || '/';
    }
}
