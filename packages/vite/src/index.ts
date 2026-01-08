import type { Plugin, ViteDevServer } from "vite"
import { generate, GenerateInput, GenerateResult, GenerateType } from '@hono-di/generate';
import fs from "node:fs/promises"
import path from "node:path"

/* ------------------------ User Provided Types ------------------------ */
/* ------------------------ Utils ------------------------ */

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

  // Fix: Check if path goes outside root (starts with ..) or is absolute (different drive on win)
  // This prevents partial matching vulnerabilities (e.g., /root vs /root_sibling)
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

/* ------------------------ Generator Logic (Server Side) ------------------------ */

// Helper to convert "my-user" to "MyUser"
const toPascalCase = (str: string) => str.replace(/(^\w|-\w)/g, (c) => c.replace('-', '').toUpperCase());
// Helper to convert "MyUser" to "my-user"
const toKebabCase = (str: string) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// Map aliases to full types for internal logic
const ALIAS_MAP: Record<string, GenerateType> = {
  mo: 'module', co: 'controller', s: 'service', pr: 'provider',
  cl: 'class', itf: 'interface', pi: 'pipe', gu: 'guard',
  f: 'filter', itc: 'interceptor', d: 'decorator'
};
type GenerateInputBody = Omit<GenerateInput, 'type'> & { type: GenerateType[] };
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
        const base = server.resolvedUrls?.local?.[0] ?? "http://localhost:5173"
        setTimeout(() => server.config.logger.info(`  ➜  File Tree: \x1b[36m${base}__hono_di/\x1b[0m\n`), 100)
      })

      /* ---- Middleware ---- */
      server.middlewares.use("/__hono_di/", async (req, res, next) => {
        if (req.originalUrl !== '/__hono_di/' && !req.originalUrl?.startsWith('/__hono_di/api')) return next();
        if (req.originalUrl?.startsWith('/__hono_di/api')) return next();
        try {
          const html = await server.transformIndexHtml(req.url ?? '/', UI_HTML)
          res.setHeader("Content-Type", "text/html; charset=utf-8")
          res.end(html)
        } catch (e) { next(e) }
      })

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
        cached ??= await getTree(server)
        res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(cached))
      })

      // Generate API
      server.middlewares.use("/__hono_di/api/generate", async (req, res) => {
        try {
          const input: GenerateInputBody = await parseBody(req);
          server.config.logger.info(`[hono_di] GENERATE ${JSON.stringify(input.type)} ${input.name}`, { timestamp: true });
          const result = await (async () => {
            const tmpRes = generate({ ...input, type: input.type });
            if (!tmpRes.success) {
              throw new Error(tmpRes.errors?.join(", ") || "Generation failed");
            }
            return { success: true, operations: tmpRes.operations };
          })();
          //   input.type.forEach((t, i) => {
          //     results.operations.push(...generate({...input, type: t}).operations);
          //   })
          // 1. Calculate Operations

          // 2. Execute Operations (if not dryRun)
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
        } catch (e: any) {
          server.config.logger.error(`[hono_di] Generate Error: ${e.message}`, { timestamp: true });
          res.statusCode = 500; res.end(JSON.stringify({ error: e.message }))
        }
      })

      // Standard File Ops
      server.middlewares.use("/__hono_di/api/file/create", async (req, res) => {
        try {
          const { path: rel, content = "" } = await parseBody(req)
          server.config.logger.info(`[hono_di] CREATE FILE ${rel}`, { timestamp: true });
          const abs = resolveSafe(server.config.root, rel)
          await fs.mkdir(path.dirname(abs), { recursive: true })
          await fs.writeFile(abs, content)
          res.end(JSON.stringify({ ok: true }))
        } catch (e: any) {
          server.config.logger.error(`[hono_di] Create File Error: ${e.message}`, { timestamp: true });
          res.statusCode = 500; res.end(JSON.stringify({ error: e.message }))
        }
      })

      server.middlewares.use("/__hono_di/api/dir/create", async (req, res) => {
        try {
          const { path: rel } = await parseBody(req);
          server.config.logger.info(`[hono_di] CREATE DIR ${rel}`, { timestamp: true });
          await fs.mkdir(resolveSafe(server.config.root, rel), { recursive: true });
          res.end(JSON.stringify({ ok: true }))
        } catch (e: any) {
          server.config.logger.error(`[hono_di] Create Dir Error: ${e.message}`, { timestamp: true });
          res.statusCode = 500; res.end(JSON.stringify({ error: e.message }))
        }
      })

      server.middlewares.use("/__hono_di/api/delete", async (req, res) => {
        try {
          const { path: rel } = await parseBody(req);
          server.config.logger.info(`[hono_di] DELETE ${rel}`, { timestamp: true });
          await fs.rm(resolveSafe(server.config.root, rel), { recursive: true, force: true });
          res.end(JSON.stringify({ ok: true }))
        } catch (e: any) {
          server.config.logger.error(`[hono_di] Delete Error: ${e.message}`, { timestamp: true });
          res.statusCode = 500; res.end(JSON.stringify({ error: e.message }))
        }
      })

      server.middlewares.use("/__hono_di/api/move", async (req, res) => {
        try {
          const { from, to } = await parseBody(req);
          server.config.logger.info(`[hono_di] MOVE ${from} -> ${to}`, { timestamp: true });
          const a = resolveSafe(server.config.root, from); const b = resolveSafe(server.config.root, to);
          await fs.mkdir(path.dirname(b), { recursive: true }); await fs.rename(a, b);
          res.end(JSON.stringify({ ok: true }))
        } catch (e: any) {
          server.config.logger.error(`[hono_di] Move Error: ${e.message}`, { timestamp: true });
          res.statusCode = 500; res.end(JSON.stringify({ error: e.message }))
        }
      })

      server.watcher.on("all", (event, file) => { if (!isIgnored(path.relative(server.config.root, file))) rebuild() })
    },
  }
}

/* ------------------------ UI ------------------------ */

const UI_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Project Explorer</title>
<!-- SweetAlert2 Dark Theme -->
<link href="https://cdn.jsdelivr.net/npm/@sweetalert2/theme-dark@4/dark.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.js"></script>
<style>
  :root { --bg: #1e1e1e; --sidebar: #252526; --text: #cccccc; --text-hover: #ffffff; --accent: #007fd4; --active: #37373d; --border: #333; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; background: var(--bg); color: var(--text); font-size: 13px; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }
  
  /* Icons */
  svg { width: 16px; height: 16px; fill: currentColor; }
  .icon-folder { color: #dcb67a; }
  .icon-file { color: #519aba; }
  .icon-chevron { width: 14px; height: 14px; transition: transform 0.15s; color: #888; margin-right: 2px; }
  .rotate-90 { transform: rotate(90deg); }

  /* Header */
  header { background: var(--sidebar); padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); height: 40px; box-sizing: border-box; }
  .title { font-weight: 600; color: #fff; font-size: 14px; }
  .actions { display: flex; gap: 8px; }
  .btn-gen { background: #4caf50; border: none; color: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 4px; }
  .btn-gen:hover { background: #45a049; }
  .search-box { background: #3c3c3c; border: 1px solid transparent; color: white; border-radius: 4px; padding: 4px 8px; width: 200px; outline: none; font-size: 12px; }
  .search-box:focus { border-color: var(--accent); }

  /* Main Tree */
  #app { flex: 1; overflow-y: auto; padding: 10px 0; }
  ul { list-style: none; padding-left: 0; margin: 0; }
  li { user-select: none; }
  
  .row { display: flex; align-items: center; padding: 4px 16px; cursor: pointer; border-left: 2px solid transparent; white-space: nowrap; height: 22px; }
  .row:hover { background: var(--active); color: var(--text-hover); }
  .row.selected { background: #094771; color: #fff; border-left-color: var(--accent); }
  .node-name { margin-left: 6px; }

  /* Context Menu */
  #context-menu { position: fixed; background: #252526; border: 1px solid #454545; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border-radius: 4px; padding: 4px 0; display: none; z-index: 100; min-width: 160px; }
  .menu-item { padding: 6px 16px; cursor: pointer; color: #ccc; display: flex; align-items: center; gap: 8px; }
  .menu-item:hover { background: #094771; color: white; }
  .separator { height: 1px; background: #454545; margin: 4px 0; }

  /* Utility classes */
  .hidden { display: none !important; }
  /* Custom Swals */
  .swal2-popup { font-size: 13px !important; border: 1px solid #454545 !important; }
  .swal2-input, .swal2-select { margin: 8px auto !important; font-size: 14px !important; }
  .gen-form { display: flex; flex-direction: column; gap: 10px; text-align: left; }
  .gen-form label { font-weight: 600; color: #ccc; font-size: 12px; margin-bottom: 2px; }
  .gen-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #ccc; }
  
  /* Type Grid */
  .type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border: 1px solid #3c3c3c; padding: 8px; border-radius: 4px; max-height: 150px; overflow-y: auto; background: #252526; }
  .type-item { display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; user-select: none; }
  .type-item input { margin: 0; cursor: pointer; }
</style>
</head>
<body>

<header>
  <div class="title">EXPLORER</div>
  <div class="actions">
    <button class="btn-gen" onclick="openGenerator()">⚡ Generate</button>
    <input id="q" class="search-box" placeholder="Search..." autocomplete="off" />
  </div>
</header>

<div id="app"></div>

<!-- Context Menu -->
<div id="context-menu">
  <div class="menu-item" onclick="promptCreate('file')">📄 New File</div>
  <div class="menu-item" onclick="promptCreate('dir')">📁 New Folder</div>
  <div class="menu-item" onclick="openGenerator()">⚡ Generate...</div>
  <div class="separator"></div>
  <div class="menu-item" onclick="promptRename()">✏️ Rename</div>
  <div class="menu-item" onclick="promptDelete()" style="color: #ff6b6b">🗑️ Delete</div>
</div>

<script type="module">
/* --- State --- */
let fullTree = null;
let expandedPaths = new Set(['']);
let selectedPath = null;
let contextNode = null;

const app = document.getElementById('app');
const qEl = document.getElementById('q');
const ctxMenu = document.getElementById('context-menu');

/* --- Icons --- */
const ICONS = {
  chevron: '<svg viewBox="0 0 16 16"><path d="M6 4l4 4-4 4z"/></svg>',
  folder: '<svg viewBox="0 0 16 16"><path d="M14.5 3H7.71l-.85-.85L6.51 2h-5C.68 2 0 2.68 0 3.5v9c0 .82.68 1.5 1.5 1.5h13c.82 0 1.5-.68 1.5-1.5v-8c0-.82-.68-1.5-1.5-1.5z"/></svg>',
  file: '<svg viewBox="0 0 16 16"><path d="M13 6h-3V3H4v10h10V6zM3 2h8l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/></svg>'
};

/* --- API --- */
async function fetchTree(){
  try {
    const r = await fetch('/__hono_di/api/tree');
    fullTree = (await r.json()).tree;
    draw();
  } catch(e) { console.error(e); }
}

async function callApi(endpoint, body) {
  const r = await fetch('/__hono_di/api/' + endpoint, { method: 'POST', body: JSON.stringify(body) });
  const res = await r.json();
  if(!r.ok) throw new Error(res.error || 'Unknown error');
  return res;
}

/* --- Render --- */
function filterTree(node, query) {
  if (!query) return node;
  const matchesSelf = node.name.toLowerCase().includes(query.toLowerCase());
  if (node.type === 'file') return matchesSelf ? node : null;
  const filteredChildren = (node.children || []).map(c => filterTree(c, query)).filter(Boolean);
  if (matchesSelf || filteredChildren.length > 0) {
    if(query) expandedPaths.add(node.path);
    return { ...node, children: filteredChildren };
  }
  return null;
}

function renderNode(node, depth = 0) {
  const isDir = node.type === 'dir';
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const li = document.createElement('li');
  const row = document.createElement('div');
  
  row.className = \`row \${isSelected ? 'selected' : ''}\`;
  row.style.paddingLeft = (depth * 12) + 'px';
  row.onclick = () => {
    selectedPath = node.path;
    if(isDir) { isExpanded ? expandedPaths.delete(node.path) : expandedPaths.add(node.path); }
    draw();
  };
  row.oncontextmenu = (e) => {
    e.preventDefault(); e.stopPropagation();
    selectedPath = node.path; contextNode = node;
    showContextMenu(e.clientX, e.clientY); draw();
  };

  let icon = isDir ? 
    \`<div class="icon-chevron \${isExpanded ? 'rotate-90' : ''}">\${ICONS.chevron}</div><div class="icon-folder">\${ICONS.folder}</div>\` : 
    \`<div style="width:16px"></div><div class="icon-file">\${ICONS.file}</div>\`;

  row.innerHTML = \`\${icon}<span class="node-name">\${node.name}</span>\`;
  li.appendChild(row);
  if (isDir && isExpanded && node.children) {
    const ul = document.createElement('ul');
    node.children.forEach(c => ul.appendChild(renderNode(c, depth + 1)));
    li.appendChild(ul);
  }
  return li;
}

function draw() {
  app.innerHTML = '';
  if (!fullTree) return;
  const treeToRender = filterTree(fullTree, qEl.value.trim());
  if (treeToRender) { const ul = document.createElement('ul'); ul.appendChild(renderNode(treeToRender)); app.appendChild(ul); }
}

/* --- Context Menu --- */
function showContextMenu(x, y) {
  ctxMenu.style.display = 'block';
  const w = window.innerWidth, h = window.innerHeight;
  ctxMenu.style.left = (x + ctxMenu.offsetWidth > w ? w - ctxMenu.offsetWidth : x) + 'px';
  ctxMenu.style.top = (y + ctxMenu.offsetHeight > h ? h - ctxMenu.offsetHeight : y) + 'px';
}
document.addEventListener('click', () => ctxMenu.style.display = 'none');

/* --- Actions (SweetAlert2) --- */
window.promptCreate = async (type) => {
  const isDir = type === 'dir';
  const node = contextNode || fullTree;
  const base = node.type === 'dir' ? node.path : node.path.split('/').slice(0, -1).join('/');
  
  const { value: name } = await Swal.fire({
    title: isDir ? 'New Folder' : 'New File',
    input: 'text',
    inputLabel: \`Inside: /\${base}\`,
    inputPlaceholder: isDir ? 'folder_name' : 'file.ts',
    showCancelButton: true
  });

  if (name) {
    const fullPath = base ? \`\${base}/\${name}\` : name;
    try {
      await callApi(isDir ? 'dir/create' : 'file/create', { path: fullPath });
      const toast = Swal.mixin({ toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000 });
      toast.fire({ icon: 'success', title: 'Created successfully' });
    } catch(e) { Swal.fire('Error', e.message, 'error'); }
  }
};

window.promptRename = async () => {
  if (!contextNode || !contextNode.path) return;
  const { value: newName } = await Swal.fire({
    title: 'Rename',
    input: 'text',
    inputValue: contextNode.name,
    showCancelButton: true
  });
  
  if (newName && newName !== contextNode.name) {
    const base = contextNode.path.split('/').slice(0, -1).join('/');
    const to = base ? \`\${base}/\${newName}\` : newName;
    try { await callApi('move', { from: contextNode.path, to }); } 
    catch(e) { Swal.fire('Error', e.message, 'error'); }
  }
};

window.promptDelete = async () => {
  if (!contextNode || !contextNode.path) return;
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: \`Delete \${contextNode.name}?\`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    confirmButtonText: 'Yes, delete it!'
  });

  if (result.isConfirmed) {
    try { await callApi('delete', { path: contextNode.path }); } 
    catch(e) { Swal.fire('Error', e.message, 'error'); }
  }
};

/* --- Generator Wizard --- */
window.openGenerator = async () => {
  const node = contextNode || fullTree;
  let initialPath = node ? (node.type === 'dir' ? node.path : node.path.split('/').slice(0, -1).join('/')) : '';
  if (!initialPath) initialPath = 'src';

  const types = [
    'module', 'controller', 'service', 'provider', 
    'class', 'interface', 'pipe', 'guard', 
    'filter', 'interceptor', 'decorator'
  ];
  
  const typeChecks = types.map(t => \`
    <label class="type-item">
      <input type="checkbox" class="type-cb" value="\${t}" \${t==='controller' || t==='service'?'checked':''}> \${t.charAt(0).toUpperCase() + t.slice(1)}
    </label>
  \`).join('');

  const { value: formValues } = await Swal.fire({
    title: 'Generate Resource',
    html: \`
      <div class="gen-form">
        <div>
          <label>Types</label>
          <div class="type-grid">
            \${typeChecks}
          </div>
        </div>
        <div>
          <label>Name</label>
          <input id="swal-name" class="swal2-input" placeholder="e.g. user-auth" style="margin:4px 0; width:100%; box-sizing:border-box;">
        </div>
        <div>
          <label>Path (Relative to root)</label>
          <input id="swal-path" class="swal2-input" value="\${initialPath}" style="margin:4px 0; width:100%; box-sizing:border-box;">
        </div>
        <div class="gen-row" style="margin-top:10px">
          <input type="checkbox" id="swal-flat"> 
          <label for="swal-flat" style="margin:0;cursor:pointer">
            Flat <span style="color:#888; font-weight:normal; font-size: 0.9em">(No sub-folder)</span>
          </label>
        </div>
        <div class="gen-row">
          <input type="checkbox" id="swal-spec" checked> 
          <label for="swal-spec" style="margin:0;cursor:pointer">
            Spec <span style="color:#888; font-weight:normal; font-size: 0.9em">(Generate test file)</span>
          </label>
        </div>
        <div class="gen-row">
          <input type="checkbox" id="swal-skip-import"> 
          <label for="swal-skip-import" style="margin:0;cursor:pointer">
            Skip Import <span style="color:#888; font-weight:normal; font-size: 0.9em">(Do not import to module)</span>
          </label>
        </div>
        <div class="gen-row">
          <input type="checkbox" id="swal-force"> 
          <label for="swal-force" style="margin:0;cursor:pointer">
            Force <span style="color:#888; font-weight:normal; font-size: 0.9em">(Overwrite existing)</span>
          </label>
        </div>
         <div class="gen-row">
          <input type="checkbox" id="swal-dry"> 
          <label for="swal-dry" style="margin:0;cursor:pointer;color:#ffab40">
            Dry Run <span style="color:#ffcc80; font-weight:normal; font-size: 0.9em">(Simulate only)</span>
          </label>
        </div>
      </div>
    \`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Generate',
    preConfirm: () => {
      const selectedTypes = Array.from(document.querySelectorAll('.type-cb:checked')).map(cb => cb.value);
      return {
        type: selectedTypes,
        name: document.getElementById('swal-name').value,
        path: document.getElementById('swal-path').value,
        flat: document.getElementById('swal-flat').checked,
        spec: document.getElementById('swal-spec').checked,
        skipImport: document.getElementById('swal-skip-import').checked,
        force: document.getElementById('swal-force').checked,
        dryRun: document.getElementById('swal-dry').checked
      }
    }
  });

  if (formValues) {
    if(!formValues.name) return Swal.fire('Error', 'Name is required', 'error');
    if(formValues.type.length === 0) return Swal.fire('Error', 'Select at least one type', 'error');
    
    try {
      const res = await callApi('generate', formValues);
      
      const opsHtml = res.operations.map(op => {
        const color = op.action === 'create' ? '#4caf50' : '#ff9800';
        return \`<div style="text-align:left; font-family:monospace; margin-top:4px">
          <span style="color:\${color}; font-weight:bold">\${op.action.toUpperCase()}</span> 
          \${op.path.split('/').pop()}
        </div>\`;
      }).join('');

      Swal.fire({
        title: res.success ? 'Success' : 'Partial Success',
        html: \`<div style="font-size:12px">\${opsHtml}</div>\`,
        icon: res.success ? 'success' : 'warning'
      });
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  }
}

/* --- HMR --- */
if (import.meta.hot) {
  import.meta.hot.on('hono_di:update', d => { fullTree = d.tree; draw(); });
}
qEl.oninput = () => draw();
fetchTree();
</script>
</body>
</html>`