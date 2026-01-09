import { IApplication } from '@hono-di/core';
import { DocumentBuilder } from './document-builder';
import { SwaggerDocument, SwaggerCustomOptions } from './interfaces';
import { SwaggerScanner } from './explorers/api-scanner';

export class SwaggerModule {
    static createDocument(app: IApplication, config: SwaggerDocument): SwaggerDocument {
        const container = app.getContainer();
        const scanner = new SwaggerScanner(container);
        const document = config;
        return scanner.scan(document);
    }

    static setup(path: string, app: IApplication, document: SwaggerDocument, options?: SwaggerCustomOptions) {
        const httpAdapter = app.getHttpAdapter();

        // Serve Swagger JSON
        httpAdapter.get(`${path}-json`, (c: any) => c.json(document));

        // Serve Swagger UI
        httpAdapter.get(path, (c: any) => {
            const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>${document.info.title}</title>
                <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
                <style>
                    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
                    *, *:before, *:after { box-sizing: inherit; }
                    body { margin: 0; background: #fafafa; }
                </style>
            </head>
            <body>
                <div id="swagger-ui"></div>
                <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" charset="UTF-8"> </script>
                <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" charset="UTF-8"> </script>
                <script>
                window.onload = function() {
                    const ui = SwaggerUIBundle({
                        spec: ${JSON.stringify(document)},
                        dom_id: '#swagger-ui',
                        deepLinking: true,
                        presets: [
                            SwaggerUIBundle.presets.apis,
                            SwaggerUIStandalonePreset
                        ],
                        plugins: [
                            SwaggerUIBundle.plugins.DownloadUrl
                        ],
                        layout: "StandaloneLayout"
                    });
                    window.ui = ui;
                };
                </script>
            </body>
            </html>`;
            return c.html(html);
        });
    }
}
