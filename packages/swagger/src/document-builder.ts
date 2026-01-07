export class DocumentBuilder {
    private readonly document: any = {
        openapi: '3.0.0',
        info: {
            title: '',
            description: '',
            version: '1.0.0',
            contact: {},
        },
        tags: [],
        servers: [],
        paths: {},
        components: {
            securitySchemes: {},
        },
    };

    setTitle(title: string): this {
        this.document.info.title = title;
        return this;
    }

    setDescription(description: string): this {
        this.document.info.description = description;
        return this;
    }

    setVersion(version: string): this {
        this.document.info.version = version;
        return this;
    }

    setContact(name: string, url: string, email: string): this {
        this.document.info.contact = { name, url, email };
        return this;
    }

    addServer(url: string, description?: string): this {
        this.document.servers.push({ url, description });
        return this;
    }

    addTag(name: string, description?: string): this {
        this.document.tags.push({ name, description });
        return this;
    }

    addBearerAuth(options: any = {}, name = 'bearer'): this {
        this.document.components.securitySchemes[name] = {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            ...options,
        };
        return this;
    }

    build(): any {
        return this.document;
    }
}
