import type { Plugin, ViteDevServer } from "vite"
import { generate, GenerateInput, GenerateResult, GenerateType } from '@hono-di/generate';
import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sirv from "sirv"

/* ------------------------ Types ------------------------ */
const toPosix = (p: string) => p.split(path.sep).join("/")

const isIgnored = (p: string) =>
  p.startsWith("node_modules/") ||
  p.startsWith(".git/") ||
  p.startsWith("dist/") ||
  p.startsWith(".vite/") ||
  p.includes("/.DS_Store") ||
  p.includes("/.idea/") ||
  p.includes("/.vscode/")

function resolveSafe(root: string, rel: string) {
  const abs = path.resolve(root, rel)
  const relCheck = path.relative(root, abs)
  if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
    throw new Error("Invalid path: Access denied")
  }
  return abs
}

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
  let timer: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

type GenerateInputBody = Omit<GenerateInput, 'type'> & { type: GenerateType[] };

/* ------------------------ Metadata Scanners ------------------------ */

async function scanFileMetadata(filepath: string) {
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    // Using Regex for simplicity as we can't depend on full AST parser in this lightweight plugin yet
    // Matches @Decorator( or @Decorator
    const hasDecorator = (name: string) => new RegExp(`@${name}\\b`).test(content);

    return {
      isModule: hasDecorator('Module'),
      isController: hasDecorator('Controller'),
      isService: hasDecorator('Injectable') || hasDecorator('Service'), // Injectable is common in DI
      content
    }
  } catch {
    return { isModule: false, isController: false, isService: false, content: '' }
  }
}

/* ------------------------ Tree Builder ------------------------ */
interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
}

async function buildTree(root: string, dir: string): Promise<TreeNode[]> {
  let entries
  try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch (e) { return [] }

  const out: TreeNode[] = []
  for (const e of entries) {
    const abs = path.join(dir, e.name)
    const rel = toPosix(path.relative(root, abs))
    if (!rel || isIgnored(rel + (e.isDirectory() ? "/" : ""))) continue

    if (e.isDirectory()) {
      out.push({ name: e.name, path: rel, type: "dir", children: await buildTree(root, abs) })
    } else {
      out.push({ name: e.name, path: rel, type: "file" })
    }
  }
  out.sort((a, b) => a.type !== b.type ? (a.type === "dir" ? -1 : 1) : a.name.localeCompare(b.name))
  return out
}

async function getTree(server: ViteDevServer) {
  const root = server.config.root
  return {
    rootAbs: root,
    tree: { name: path.basename(root), path: "", type: "dir", children: await buildTree(root, root) } as TreeNode,
  }
}

/* ------------------------ Stats & Graph ------------------------ */

async function getStats(dir: string): Promise<Record<string, number>> {
  const stats = { modules: 0, controllers: 0, services: 0, files: 0, dirs: 0 };

  async function walk(d: string) {
    let entries;
    try { entries = await fs.readdir(d, { withFileTypes: true }); } catch { return; }

    for (const e of entries) {
      if (e.isDirectory()) {
        if (isIgnored(path.relative(dir, path.join(d, e.name)) + '/')) continue;
        stats.dirs++;
        await walk(path.join(d, e.name));
      } else {
        if (isIgnored(path.relative(dir, path.join(d, e.name)))) continue;
        stats.files++;
        const meta = await scanFileMetadata(path.join(d, e.name));
        if (meta.isModule) stats.modules++;
        if (meta.isController) stats.controllers++;
        if (meta.isService) stats.services++;
      }
    }
  }
  await walk(dir);
  return stats;
}

async function getGraph(dir: string) {
  const nodes: any[] = [];
  const edges: any[] = [];
  const idMap = new Map<string, number>();
  let idCounter = 1;

  async function walk(d: string) {
    let entries;
    try { entries = await fs.readdir(d, { withFileTypes: true }); } catch { return; }

    for (const e of entries) {
      const fullPath = path.join(d, e.name);
      if (e.isDirectory()) {
        if (isIgnored(path.relative(dir, fullPath) + '/')) continue;
        await walk(fullPath);
      } else {
        if (isIgnored(path.relative(dir, fullPath))) continue;

        const meta = await scanFileMetadata(fullPath);
        if (meta.isModule) {
          // Use filename as label base, or try to extract class name?
          // Extract Class Name for better labels: export class UserModule
          const classMatch = meta.content.match(/class\s+(\w+)/);
          const label = classMatch ? classMatch[1] : e.name;
          // Clean label: UserModule -> User
          const name = label.replace(/Module$/, '');

          if (!idMap.has(name)) {
            idMap.set(name, idCounter++);
            nodes.push({ id: idMap.get(name), label: name, group: 'module' });
          }
          const sourceId = idMap.get(name);

          // imports: [UserModule, AuthModule]
          const importMatch = meta.content.match(/imports:\s*\[([\s\S]*?)\]/);
          if (importMatch && importMatch[1]) {
            const imports = importMatch[1].split(',').map(s => s.trim())
              .filter(s => s && !s.startsWith('/')); // Ignore paths

            for (const imp of imports) {
              // Assuming import is a Class Name
              const cleanImp = imp.replace(/Module$/, '').replace(/['"]/g, '');
              if (!cleanImp) continue;

              // We don't guarantee the target node exists yet or will exist
              // So we create a node placeholder if needed, or link by name later
              // For VisJS, we need IDs. 

              // We'll trust the Class Name convention here.
              if (!idMap.has(cleanImp)) {
                // Create a placeholder node? Or wait?
                // Let's create it.
                idMap.set(cleanImp, idCounter++);
                nodes.push({ id: idMap.get(cleanImp), label: cleanImp, group: 'module' });
              }

              const targetId = idMap.get(cleanImp);
              if (sourceId !== targetId) {
                edges.push({ from: sourceId, to: targetId });
              }
            }
          }
        }
      }
    }
  }

  await walk(dir);
  return { nodes, edges };
}

/* ------------------------ Plugin ------------------------ */

export default function hono_diVisualizer(): Plugin {
  let serverRef: ViteDevServer
  let cached: any

  const rebuild = debounce(async () => {
    if (!serverRef) return
    try {
      cached = await getTree(serverRef)
      serverRef.ws.send({ type: "custom", event: "hono_di:update", data: cached })
    } catch (e) { serverRef.config.logger.error(`[hono_di] Error: ${e}`) }
  }, 100)

  return {
    name: "vite-plugin-hono_di-visualizer",
    apply: "serve",
    configureServer(server) {
      serverRef = server
      server.httpServer?.once("listening", () => {
        const base = (server.resolvedUrls?.local?.[0] ?? "http://localhost:5173").replace(/\/$/, "")
        setTimeout(() => server.config.logger.info(`  ➜  File Tree: \x1b[36m${base}/__hono_di/\x1b[0m\n`), 100)
      })

      /* ---- API Handlers (Must be first) ---- */
      const parseBody = (req: any): Promise<any> => {
        return new Promise((resolve, reject) => {
          let body = ""
          req.on("data", (c: any) => (body += c))
          req.on("end", () => {
            if (!body) return resolve({})
            try { resolve(JSON.parse(body)) } catch (e) { reject(e) }
          })
          req.on("error", reject)
        })
      }

      /* ---- API Router ---- */
      server.middlewares.use("/__hono_di/api", async (req, res, next) => {
        // Normalize URL: ensure we handle both prefixed and stripped URLs
        let url = req.url || "/";
        const prefix = "/__hono_di/api";
        if (url.startsWith(prefix)) {
          url = url.slice(prefix.length);
        }
        const [pathOnly] = url.split('?');

        // server.config.logger.info(`[hono_di] API Request: ${req.method} ${pathOnly}`, { timestamp: true });

        try {
          if (pathOnly === "/tree" || pathOnly === "/tree/") {
            cached ??= await getTree(server)
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify(cached))
          }
          if (pathOnly === "/stats" || pathOnly === "/stats/") {
            const stats = await getStats(path.join(server.config.root, 'src'));
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify(stats));
          }
          if (pathOnly === "/graph" || pathOnly === "/graph/") {
            const graph = await getGraph(path.join(server.config.root, 'src'));
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify(graph));
          }
          if (pathOnly === "/generate") {
            const input: GenerateInputBody = await parseBody(req);
            server.config.logger.info(`[hono_di] GENERATE ${JSON.stringify(input.type)} ${input.name}`, { timestamp: true });
            const result = await (async () => {
              const tmpRes = generate({ ...input, type: input.type });
              if (!tmpRes.success) throw new Error(tmpRes.errors?.join(", ") || "Generation failed");
              return { success: true, operations: tmpRes.operations };
            })();
            if (result.success && !input.dryRun) {
              for (const op of result.operations) {
                const absPath = resolveSafe(server.config.root, op.path);
                if (op.action === 'create' || op.action === 'overwrite') {
                  await fs.mkdir(path.dirname(absPath), { recursive: true });
                  await fs.writeFile(absPath, op.content || '');
                }
              }
            }
            return res.end(JSON.stringify(result));
          }

          // File Ops
          if (pathOnly === "/file/create") {
            const body = await parseBody(req)
            const abs = resolveSafe(server.config.root, body.path)
            if (existsSync(abs)) throw new Error("File already exists")
            await fs.writeFile(abs, "")
            return res.end(JSON.stringify({ success: true }))
          }
          if (pathOnly === "/dir/create") {
            const body = await parseBody(req)
            const abs = resolveSafe(server.config.root, body.path)
            if (existsSync(abs)) throw new Error("Directory already exists")
            await fs.mkdir(abs, { recursive: true })
            return res.end(JSON.stringify({ success: true }))
          }
          if (pathOnly === "/delete") {
            const body = await parseBody(req)
            const abs = resolveSafe(server.config.root, body.path)
            await fs.rm(abs, { recursive: true, force: true })
            return res.end(JSON.stringify({ success: true }))
          }
          if (pathOnly === "/move") {
            const body = await parseBody(req)
            const from = resolveSafe(server.config.root, body.from)
            const to = resolveSafe(server.config.root, body.to)
            await fs.rename(from, to)
            return res.end(JSON.stringify({ success: true }))
          }

          // No match
          next();

        } catch (e: any) {
          server.config.logger.error(`[hono_di] API Error: ${e.message}`, { timestamp: true })
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })

      /* ---- Static Files (SPA) ---- */
      /* ---- Static Files (SPA) ---- */
      const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
      const clientDist = toPosix(path.join(_dirname, 'client'));

      server.config.logger.info(`[hono_di] Serving static assets from: ${clientDist}`, { timestamp: true });

      if (existsSync(clientDist)) {
        // Intercept index.html to inject Vite Client for HMR
        server.middlewares.use("/__hono_di", async (req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            try {
              const htmlPath = path.join(clientDist, 'index.html');
              let html = await fs.readFile(htmlPath, 'utf-8');
              html = html.replace('</head>', '<script type="module" src="/@vite/client"></script></head>');
              res.setHeader('Content-Type', 'text/html');
              res.end(html);
            } catch (e) {
              console.error("[hono_di] Failed to serve injected HTML", e);
              next();
            }
          } else {
            next();
          }
        });

        server.middlewares.use("/__hono_di", sirv(clientDist, { dev: true, single: true, etag: true }));
      } else {
        server.config.logger.warn(`[hono_di] Client not found at ${clientDist}. Build the client first.`, { timestamp: true });
      }

      server.watcher.on("all", (event, file) => { if (!isIgnored(path.relative(server.config.root, file))) rebuild() })
    },
  }
}