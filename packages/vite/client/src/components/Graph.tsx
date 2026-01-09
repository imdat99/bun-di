import { useEffect, useRef } from 'preact/hooks';
import { callApi } from '../api';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Button, Layout } from '@douyinfe/semi-ui';
import { RefreshCcw } from 'lucide-preact';

const { Header, Content } = Layout;

export function Graph() {
    const containerRef = useRef<HTMLDivElement>(null);
    const networkRef = useRef<any>(null);

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
                    font: { color: 'var(--semi-color-text-0)', face: 'Inter' },
                    borderWidth: 2,
                    color: { background: 'var(--semi-color-bg-0)', border: 'var(--semi-color-primary)', highlight: { background: 'var(--semi-color-primary)', border: '#fff' } }
                },
                edges: {
                    width: 1, color: { color: 'var(--semi-color-text-2)', highlight: 'var(--semi-color-primary)' },
                    arrows: 'to', smooth: { type: 'continuous' }
                },
                physics: {
                    stabilization: false,
                    barnesHut: { gravitationalConstant: -2000, springLength: 0.005 }
                },
                layout: { randomSeed: 2 }
            };

            networkRef.current = new Network(containerRef.current, { nodes: nodes as any, edges: edges as any }, options as any);
        } catch (e) { console.error(e); }
    }

    return (
        <Layout style={{ height: '100%' }}>
            <Header style={{ backgroundColor: 'var(--semi-color-bg-1)', borderBottom: '1px solid var(--semi-color-border)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--semi-color-primary)', boxShadow: '0 0 8px var(--semi-color-primary)' }}></div>
                    DEPENDENCY GRAPH
                </div>
                <Button icon={<RefreshCcw size={16} />} onClick={loadGraph}>Refresh Graph</Button>
            </Header>
            <Content>
                <div ref={containerRef} style={{ width: '100%', height: '100%', backgroundColor: 'var(--semi-color-bg-0)' }}></div>
                <div style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: 'var(--semi-color-bg-2)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--semi-color-border)', fontSize: 11, color: 'var(--semi-color-text-2)' }}>
                    Scroll to Zoom • Drag to Pan
                </div>
            </Content>
        </Layout>
    );
}
