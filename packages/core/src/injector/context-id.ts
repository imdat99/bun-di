export class ContextId {
    public readonly id: string;

    constructor() {
        this.id = crypto.randomUUID();
    }
}

export const STATIC_CONTEXT_ID = new ContextId();
