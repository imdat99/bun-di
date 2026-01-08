
import { useEffect, useRef } from 'preact/hooks';
import { callApi } from '../api';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

export function Graph() {
    const containerRef = useRef<HTMLDivElement>(null);
    const networkRef = useRef<Network | null>(null);

    useEffect(() => {
        loadGraph();
        return () => networkRef.current?.destroy();
    }, []);

    async function loadGraph() {
        if (!containerRef.current) return;
        try {
            const data = await callApi('graph');
            const nodes = new DataSet(data.nodes);
            const edges = new DataSet(data.edges);

            const options = {
                nodes: {
                    shape: 'dot', size: 16,
                    font: { color: '#ffffff', face: 'Inter' },
                    borderWidth: 2,
                    color: { background: '#202020', border: '#6366f1', highlight: { background: '#6366f1', border: '#fff' } }
                },
                edges: {
                    width: 1, color: { color: '#444', highlight: '#6366f1' },
                    arrows: 'to', smooth: { type: 'continuous' }
                },
                physics: {
                    stabilization: false,
                    barnesHut: { gravitationalConstant: -2000, springCreate: 0.005 }
                },
                layout: { randomSeed: 2 }
            };

            networkRef.current = new Network(containerRef.current, { nodes: nodes as any, edges: edges as any }, options as any);
        } catch (e) { console.error(e); }
    }

    return (
        <div class="flex flex-col w-full h-full text-white">
            <header class="bg-header backdrop-blur-md px-5 h-[52px] flex items-center justify-between border-b border-border z-10">
                <div class="flex items-center gap-2 font-semibold text-sm tracking-tight">
                    <div class="w-2 h-2 bg-accent rounded-full shadow-[0_0_12px_var(--accent)]"></div>
                    DEPENDENCY GRAPH
                </div>
                <button
                    class="bg-gradient-to-br from-accent to-accent-hover text-white px-4 py-1.5 rounded-md cursor-pointer text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm hover:-translate-y-px"
                    onClick={loadGraph}>Refresh Graph</button>
            </header>
            <div ref={containerRef} class="flex-1 w-full h-full bg-[#111]"></div>
            <div class="absolute bottom-5 right-5 bg-sub p-2 rounded-lg border border-border flex gap-2 shadow-lg">
                <div class="text-[11px] text-neutral-400">Scroll to Zoom • Drag to Pan</div>
            </div>
        </div>
    );
}
