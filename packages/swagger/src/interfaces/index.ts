export interface SwaggerDocument {
    openapi: string;
    info: {
        title: string;
        description: string;
        version: string;
        contact?: {
            name: string;
            url: string;
            email: string;
        };
    };
    tags: { name: string; description?: string }[];
    servers: { url: string; description?: string }[];
    paths: Record<string, Record<string, any>>;
    components: {
        schemas: Record<string, any>;
        securitySchemes: Record<string, any>;
    };
}

export interface SwaggerCustomOptions {
    explorer?: boolean;
    swaggerOptions?: Record<string, any>;
    customCss?: string;
    customCssUrl?: string;
    customJs?: string;
    customJsUrl?: string;
    customSiteTitle?: string;
}
