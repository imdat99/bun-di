
import { Folder, Activity, Layers } from 'lucide-preact';
import { Nav } from '@douyinfe/semi-ui';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const navItems = [
        { itemKey: 'files', icon: <Folder size={20} />, text: 'Files' },
        { itemKey: 'graph', icon: <Activity size={20} />, text: 'Graph' },
        { itemKey: 'dashboard', icon: <Layers size={20} />, text: 'Overview' },
    ];

    return (
        <div style={{ height: '100%', backgroundColor: 'var(--semi-color-bg-1)', borderRight: '1px solid var(--semi-color-border)' }}>
            <Nav
                defaultSelectedKeys={[activeTab]}
                onSelect={(data) => onTabChange(data.itemKey as string)}
                style={{ height: '100%' }}
                isCollapsed={true}
                mode="vertical"
                items={navItems}
                footer={{ collapseButton: true }}
            />
        </div>
    );
}
