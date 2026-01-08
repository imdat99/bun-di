import { ViteDevServer } from "vite";
import { generate, GenerateInput, GenerateResult, GenerateType } from '@hono-di/generate';
import fs from "node:fs/promises";
import path from "node:path";
import { resolveSafe } from "./utils";
import { getTree } from "./tree";

type GenerateInputBody = Omit<GenerateInput, 'type'> & { type: GenerateType[] };

export function setupApiServer(server: ViteDevServer, updateTree: () => Promise<void>) {
    const parseBody = (req: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            let body = ""
            req.on("data", (c: any) => (body += c))
            req.on("end", () => { try { resolve(JSON.parse(body)) } catch (e) { reject(e) } })
            req.on("error", reject)
        })
    }

    /* ---- API Handlers ---- */
    server.middlewares.use("/__hono_di/api/tree", async (_, res) => {
        try {
            const cached = await getTree(server)
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(cached))
        } catch (e: any) {
            res.statusCode = 500; res.end(JSON.stringify({ error: e.message }))
        }
    })

    server.middlewares.use("/__hono_di/api/generate", async (req, res) => {
        try {
            const input: GenerateInputBody = await parseBody(req);
            server.config.logger.info(`[hono-di] GENERATE ${JSON.stringify(input.type)} ${input.name}`, { timestamp: true });

            const result = await Promise.all(input.type.map(async (t) => {
                return new Promise<GenerateResult['operations']>(async (resolve, reject) => {
                    const tmpRes = generate({ ...input, type: t })
                    if (!tmpRes.success) {
                        return reject(tmpRes.errors?.join(", ") || "Generation failed");
                    }
                    resolve(tmpRes.operations);
                });
            })).then((ops) => ops.flat()).then(ops => ({ success: true, operations: ops }));

            if (result.success && !input.dryRun) {
                for (const op of result.operations) {
                    const absPath = resolveSafe(server.config.root, op.path);
                    if (op.action === 'create' || op.action === 'overwrite') {
                        server.config.logger.info(`  - Creating: ${op.path}`, { timestamp: true });
                        await fs.mkdir(path.dirname(absPath), { recursive: true });
                        await fs.writeFile(absPath, op.content || '');
                    }
                }
            }
            res.end(JSON.stringify(result));
            updateTree(); // Trigger update
        } catch (e: any) {
            server.config.logger.error(`[hono-di] Generate Error: ${e.message}`, { timestamp: true });
            res.statusCode = 500; res.end(JSON.stringify({ error: e.message }))
        }
    })

    server.middlewares.use("/__hono_di/api/client", async (req, res) => {
        try {
            const body = await parseBody(req);
            const { project = 'tsconfig.json', output = 'client.d.ts' } = body;
            
            server.config.logger.info(`[hono-di] Generating Client SDK...`, { timestamp: true });
            
            // Dynamic import to avoid bundling issues if possible, or just standard import
            // Using dynamic import matching CLI behavior
            const { TypeGenerator } = await import('@hono-di/client');
            
            const generator = new TypeGenerator({
                tsConfigFilePath: resolveSafe(server.config.root, project),
            });

            const content = await generator.generate();
            await fs.writeFile(resolveSafe(server.config.root, output), content);
            
            server.config.logger.info(`[hono-di] Client SDK Generated at ${output}`, { timestamp: true });
            
            res.end(JSON.stringify({ success: true }));
             updateTree();
        } catch (e: any) {
             server.config.logger.error(`[hono-di] Client Gen Error: ${e.message}`, { timestamp: true });
            res.statusCode = 500; res.end(JSON.stringify({ error: e.message }))
        }
    })

    server.middlewares.use("/__hono_di/api/fs", async (req, res) => {
        try {
            const body = await parseBody(req);
            const { action } = body;

            if (action === 'createFile') {
                const { path: rel, content = "" } = body;
                await fs.writeFile(resolveSafe(server.config.root, rel), content);
            } else if (action === 'createDir') {
                const { path: rel } = body;
                await fs.mkdir(resolveSafe(server.config.root, rel), { recursive: true });
            } else if (action === 'delete') {
                const { path: rel } = body;
                await fs.rm(resolveSafe(server.config.root, rel), { recursive: true, force: true });
            } else if (action === 'move') {
                const { from, to } = body;
                await fs.rename(resolveSafe(server.config.root, from), resolveSafe(server.config.root, to));
            } else {
                throw new Error(`Unknown action: ${action}`);
            }
            res.end(JSON.stringify({ ok: true }));
             updateTree(); // Trigger update
        } catch (e: any) {
            server.config.logger.error(`[hono-di] FS Error: ${e.message}`, { timestamp: true });
            res.statusCode = 500; res.end(JSON.stringify({ error: e.message }))
        }
    })
}
