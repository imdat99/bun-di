import path from "node:path"

export const toPosix = (p: string) => p.split(path.sep).join("/")

export const isIgnored = (p: string) =>
  p.startsWith("node_modules/") ||
  p.startsWith(".git/") ||
  p.startsWith("dist/") ||
  p.startsWith(".vite/") ||
  p.includes("/.DS_Store") ||
  p.includes("/.idea/") ||
  p.includes("/.vscode/")

export function resolveSafe(root: string, rel: string) {
  const abs = path.resolve(root, rel)
  const relCheck = path.relative(root, abs)
  
  if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
    throw new Error("Invalid path: Access denied")
  }
  return abs
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
  let timer: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
