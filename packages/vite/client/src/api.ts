
export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
}

export type GenerateType = 
    | 'module' | 'controller' | 'provider' | 'service' | 'class' | 'interface'
    | 'pipe' | 'guard' | 'filter' | 'interceptor' | 'decorator';

export interface GenerateInput {
    type: GenerateType[];
    name: string;
    path: string;
    flat: boolean;
    spec: boolean;
    skipImport: boolean;
    force: boolean;
    dryRun: boolean;
}

export interface Operation {
    action: 'create' | 'update' | 'delete' | 'skip' | 'overwrite' | 'error';
    path: string;
    content?: string;
}

export interface GenerateResult {
    success: boolean;
    operations: Operation[];
    errors?: string[];
}

export const api = {
    async getTree(): Promise<{ tree: TreeNode, rootAbs: string }> {
        const res = await fetch('/__hono_di/api/tree');
        if (!res.ok) throw new Error('Failed to fetch tree');
        return res.json();
    },

    async generate(input: GenerateInput): Promise<GenerateResult> {
        const res = await fetch('/__hono_di/api/generate', {
            method: 'POST',
            body: JSON.stringify(input),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Generation failed');
        }
        return res.json();
    },

    async fs(action: 'createFile' | 'createDir' | 'delete' | 'move', payload: any) {
        const res = await fetch('/__hono_di/api/fs', {
            method: 'POST',
            body: JSON.stringify({ action, ...payload }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'FS operation failed');
        }
        return res.json();
    },

    async generateClient(payload: { project: string, output: string }) {
        const res = await fetch('/__hono_di/api/client', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Client generation failed');
        }
        return res.json();
    }
};
