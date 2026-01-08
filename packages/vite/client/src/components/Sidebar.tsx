
import { Folder, Activity, Layers } from 'lucide-preact';
import clsx from 'clsx';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const navItems = [
        { id: 'files', icon: Folder, label: 'Files' },
        { id: 'graph', icon: Activity, label: 'Graph' },
        { id: 'dashboard', icon: Layers, label: 'Overview' },
    ];

    return (
        <div class="w-[60px] bg-sub border-r border-border flex flex-col items-center pt-2.5 gap-2.5 z-20">
            {navItems.map(item => (
                <div
                    key={item.id}
                    className={clsx(
                        "w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all relative group",
                        activeTab === item.id
                            ? "bg-accent text-white shadow-lg shadow-indigo-500/40"
                            : "text-neutral-400 hover:bg-white/5 hover:text-white"
                    )}
                    onClick={() => onTabChange(item.id)}
                >
                    <item.icon size={20} />
                    <div class="absolute left-[50px] bg-black text-white px-2 py-1 rounded text-[11px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        {item.label}
                    </div>
                </div>
            ))}
        </div>
    );
}
