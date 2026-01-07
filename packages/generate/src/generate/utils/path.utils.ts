import path from 'node:path';

export function normalizePath(p: string): string {
    return p.split(path.sep).join('/');
}
