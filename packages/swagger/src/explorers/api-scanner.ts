import { Container, METADATA_KEYS, RequestMethod } from '@hono-di/core';
import { DECORATORS } from '../decorators';
import { SwaggerDocument } from '../interfaces';

export class SwaggerScanner {
    constructor(private readonly container: Container) { }

    scan(document: SwaggerDocument): SwaggerDocument {
        const modules = this.container.getModules();

        modules.forEach((module) => {
            module.controllers.forEach((wrapper) => {
                this.scanController(wrapper.metatype, document);
            });
        });

        return document;
    }

    private scanController(controller: any, document: SwaggerDocument) {
        if (!controller) return;

        const { prefix } = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, controller) || { prefix: '' };
        const routes = Reflect.getMetadata(METADATA_KEYS.ROUTES, controller) || [];
        const apiTags = Reflect.getMetadata(DECORATORS.API_TAGS, controller) || [];

        // Add tags to document
        apiTags.forEach((tag: string) => {
            if (!document.tags.find(t => t.name === tag)) {
                document.tags.push({ name: tag });
            }
        });

        routes.forEach((route: any) => {
            const method = route.requestMethod;
            const path = this.normalizePath(prefix, route.path);
            const descriptor = Object.getOwnPropertyDescriptor(controller.prototype, route.methodName);
            const handler = descriptor?.value;

            if (!handler) return;

            const operation = this.createOperation(handler, apiTags);

            if (!document.paths[path]) {
                document.paths[path] = {};
            }
            document.paths[path][method] = operation;
        });
    }

    private createOperation(handler: any, controllerTags: string[]) {
        const apiOperation = Reflect.getMetadata(DECORATORS.API_OPERATION, handler) || {};
        const apiResponses = Reflect.getMetadata(DECORATORS.API_RESPONSE, handler) || {};

        const responses: Record<string, any> = {};
        Object.keys(apiResponses).forEach(status => {
            responses[status] = {
                description: apiResponses[status].description,
            };
        });

        // Default response if none provided
        if (Object.keys(responses).length === 0) {
            responses['200'] = { description: 'Successful operation' };
        }

        return {
            summary: apiOperation.summary || '',
            description: apiOperation.description || '',
            tags: controllerTags,
            responses,
            // TODO: Add parameters and request body scanning
        };
    }

    private normalizePath(prefix: string, path: string): string {
        const cleanPrefix = prefix ? prefix.replace(/^\/+/, '').replace(/\/+$/, '') : '';
        const cleanPath = path ? path.replace(/^\/+/, '').replace(/\/+$/, '') : '';
        let result = '';
        if (cleanPrefix) result += `/${cleanPrefix}`;
        if (cleanPath) result += `/${cleanPath}`;
        return (result || '/').replace(/:([^\/]+)/g, '{$1}'); // Convert :param to {param}
    }
}
