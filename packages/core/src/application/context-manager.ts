import { ContextId } from '../injector/context-id';

/**
 * Manages request-scoped context lifecycle
 * 
 * @remarks
 * Tracks active request contexts and provides cleanup functionality
 * for memory management of REQUEST-scoped dependencies.
 * 
 * @internal
 */
export class ContextManager {
    private readonly activeContexts = new Set<ContextId>();

    /**
     * Registers a new context as active
     */
    addContext(contextId: ContextId): void {
        this.activeContexts.add(contextId);
    }

    /**
     * Removes a context and allows cleanup
     */
    removeContext(contextId: ContextId): void {
        this.activeContexts.delete(contextId);
    }

    /**
     * Gets all currently active contexts
     */
    getActiveContexts(): Set<ContextId> {
        return this.activeContexts;
    }

    /**
     * Clears all tracked contexts
     */
    clearAll(): void {
        this.activeContexts.clear();
    }
}
