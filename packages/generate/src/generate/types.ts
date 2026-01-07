export type GenerateType =
    | 'module'
    | 'controller'
    | 'provider'
    | 'service'
    | 'class'
    | 'interface'
    | 'pipe'
    | 'guard'
    | 'filter'
    | 'interceptor'
    | 'decorator';

export interface GenerateInput {
    type: GenerateType;
    name: string;
    path?: string;
    flat?: boolean;
    dryRun?: boolean;
    force?: boolean;
    spec?: boolean;
    skipImport?: boolean;
}

export interface GenerateResult {
    success: boolean;
    operations: Array<{
        action: 'create' | 'overwrite' | 'skip' | 'error';
        path: string;
        content?: string;
    }>;
    errors?: string[];
    warnings?: string[];
}
