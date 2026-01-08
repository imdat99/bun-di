import type { Plugin, ViteDevServer } from "vite"
import path from "node:path"
import sirv from 'sirv'
import { fileURLToPath } from "node:url"
import { getTree } from "./tree"
import { debounce, isIgnored } from "./utils"
import { setupApiServer } from "./api"

const _dirname = path.dirname(fileURLToPath(import.meta.url))

export default function honoDiPlugin(): Plugin {
  let serverRef: ViteDevServer
  let cached: any

  const updateTree = debounce(async () => {
    if (!serverRef) return
    try {
      cached = await getTree(serverRef)
      serverRef.ws.send({ type: "custom", event: "hono-di:update", data: cached })
    } catch (e) { serverRef.config.logger.error(`[hono-di] Error: ${e}`) }
  }, 100)

  // Wrapper for updateTree to return Promise<void> matching expectation
  const updateTreeWrapper = async () => { updateTree(); return Promise.resolve(); }

  return {
    name: "vite-plugin-hono-di",
    apply: "serve",
    configureServer(server) {
      serverRef = server
      
      const clientDist = path.resolve(_dirname, "../client")
      const serve = sirv(clientDist, { dev: true, etag: true })

      // Serve Client
      server.middlewares.use("/__hono_di", (req, res, next) => {
        if (req.url === "/") {
          req.url = "/index.html"
        }
        if (!req.url?.startsWith("/api")) {
           serve(req, res, next)
           return
        }
        next()
      });

      server.httpServer?.once("listening", () => {
        const base = server.resolvedUrls?.local?.[0] ?? "http://localhost:5173"
        setTimeout(() => server.config.logger.info(`  ➜  Hono DI: \x1b[36m${base}__hono_di/\x1b[0m\n`), 100)
      })

      // Setup API
      setupApiServer(server, updateTreeWrapper)

      server.watcher.on("all", (event, file) => { if(!isIgnored(path.relative(server.config.root, file))) updateTree() })
    },
  }
}
