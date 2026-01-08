
import { useEffect, useState } from 'preact/hooks';
import { callApi } from '../api';
import { Box, Layers, Component, FileCode } from 'lucide-preact';

export function Dashboard() {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        callApi('stats').then(setStats).catch(console.error);
    }, []);

    if (!stats) return <div class="p-8">Loading...</div>;

    const cards = [
        { id: 'modules', label: 'Modules', val: stats.modules, icon: Box },
        { id: 'controllers', label: 'Controllers', val: stats.controllers, icon: Layers },
        { id: 'services', label: 'Services', val: stats.services, icon: Component },
        { id: 'files', label: 'Total Files', val: stats.files, icon: FileCode },
    ];

    return (
        <div class="p-8 overflow-y-auto w-full">
            <div class="mb-8">
                <div class="text-2xl font-semibold mb-2">Project Overview</div>
                <div class="text-neutral-400 text-sm">Real-time statistics of your DI container</div>
            </div>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5 mb-10">
                {cards.map(c => (
                    <div key={c.id} class="bg-card border border-border rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
                        <div class="absolute top-0 left-0 w-full h-0.5 bg-accent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        <span class="text-neutral-400 text-xs font-medium uppercase tracking-wider">{c.label}</span>
                        <span class="text-3xl font-bold text-white tracking-tight">{c.val}</span>
                        <div class="absolute right-5 bottom-5 opacity-10 text-current w-12 h-12">
                            <c.icon size={48} strokeWidth={1.5} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
