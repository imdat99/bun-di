import fs from 'node:fs';
import path from 'node:path';

export function ensureDirectoryExists(filePath: string) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExists(dirname);
    fs.mkdirSync(dirname);
}

export function writeFile(filePath: string, content: string) {
    ensureDirectoryExists(filePath);
    fs.writeFileSync(filePath, content, 'utf-8');
}

export function fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
}
