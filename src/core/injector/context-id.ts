export class ContextId {
    private static idCounter = 0;
    public readonly id: number;

    constructor() {
        this.id = ContextId.idCounter++;
    }
}

export const STATIC_CONTEXT_ID = new ContextId();
