import fs from "node:fs/promises"
import path from "node:path"
import { ViteDevServer } from "vite"
import { toPosix, isIgnored } from "./utils"

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
}

export async function buildTree(root: string, dir: string): Promise<TreeNode[]> {
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

export async function getTree(server: ViteDevServer) {
  const root = server.config.root
  return {
    rootAbs: root,
    tree: { name: path.basename(root), path: "", type: "dir", children: await buildTree(root, root) } as TreeNode,
  }
}
