
import { useState, useEffect } from 'preact/hooks';
import { ChevronRight, File, Folder } from 'lucide-preact';
import clsx from 'clsx';
import { callApi } from '../api';
import Swal from 'sweetalert2';
import { ContextMenu } from './ContextMenu';

interface TreeNode {
    name: string;
    path: string;
    type: "file" | "dir";
    children?: TreeNode[];
}

interface FileTreeProps {
    tree: TreeNode | null;
    onRefresh: () => void;
    onGenerate: (path: string) => void;
    searchQuery: string;
}

export function FileTree({ tree, onRefresh, onGenerate, searchQuery }: FileTreeProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set(['']));
    const [selected, setSelected] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNode } | null>(null);

    // Expand nodes when searching
    useEffect(() => {
        if (searchQuery && tree) {
            const newExpanded = new Set(expanded);
            const expandMatch = (node: TreeNode) => {
                if (filterTree(node, searchQuery)) {
                    if (node.type === 'dir') newExpanded.add(node.path);
                    node.children?.forEach(expandMatch);
                }
            };
            expandMatch(tree);
            setExpanded(newExpanded);
        }
    }, [searchQuery, tree]);


    const toggle = (path: string) => {
        const next = new Set(expanded);
        if (next.has(path)) next.delete(path); else next.add(path);
        setExpanded(next);
    };

    const handleContextMenu = (e: MouseEvent, node: TreeNode) => {
        e.preventDefault();
        e.stopPropagation();
        setSelected(node.path);
        setContextMenu({ x: e.clientX, y: e.clientY, node });
    };

    const handleAction = (action: string) => {
        if (!contextMenu) return;
        const { node } = contextMenu;
        setContextMenu(null);

        if (action === 'generate') {
            onGenerate(node.path);
        } else if (action === 'delete') {
            confirmDelete(node);
        } else if (action === 'rename') {
            promptRename(node);
        } else if (action === 'new-file') {
            promptCreate(node, 'file');
        } else if (action === 'new-folder') {
            promptCreate(node, 'dir');
        }
    };

    const promptCreate = async (node: TreeNode, type: 'file' | 'dir') => {
        const isDir = type === 'dir';
        // if context node is file, use parent dir
        const base = node.type === 'dir' ? node.path : node.path.split('/').slice(0, -1).join('/');

        const { value: name } = await Swal.fire({
            title: isDir ? 'New Folder' : 'New File',
            input: 'text',
            inputLabel: `Inside: /${base}`,
            inputPlaceholder: isDir ? 'folder_name' : 'file.ts',
            showCancelButton: true,
            background: '#1f1f23', color: '#fff'
        });

        if (name) {
            const fullPath = base ? `${base}/${name}` : name;
            try {
                await callApi(isDir ? 'dir/create' : 'file/create', { path: fullPath });
                onRefresh();
            } catch (e: any) { Swal.fire({ title: 'Error', text: e.message, icon: 'error', background: '#1f1f23', color: '#fff' }); }
        }
    };

    const promptRename = async (node: TreeNode) => {
        const { value: newName } = await Swal.fire({
            title: 'Rename',
            input: 'text',
            inputValue: node.name,
            showCancelButton: true,
            background: '#1f1f23', color: '#fff'
        });

        if (newName && newName !== node.name) {
            try {
                const oldPath = node.path;
                const base = oldPath.split('/').slice(0, -1).join('/');
                const newPath = base ? `${base}/${newName}` : newName;
                await callApi('move', { from: oldPath, to: newPath });
                onRefresh();
            } catch (e: any) { Swal.fire({ title: 'Error', text: e.message, icon: 'error', background: '#1f1f23', color: '#fff' }); }
        }
    };

    const confirmDelete = async (node: TreeNode) => {
        const { isConfirmed } = await Swal.fire({
            title: `Delete ${node.name}?`,
            text: 'This action cannot be undone',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            background: '#1f1f23',
            color: '#fff'
        });

        if (isConfirmed) {
            await callApi('delete', { path: node.path });
            onRefresh();
        }
    };

    // Recursive renderer
    const renderNode = (node: TreeNode, depth = 0) => {
        const isDir = node.type === 'dir';
        const isExpanded = expanded.has(node.path);
        const isSelected = selected === node.path;

        return (
            <li key={node.path}>
                <div
                    className={clsx(
                        "flex items-center px-4 min-h-[26px] cursor-pointer border-l-2 border-transparent transition-colors relative group",
                        isSelected ? "bg-[#2e2e32] border-l-accent" : "hover:bg-[#27272a]"
                    )}
                    style={{ paddingLeft: 16 + depth * 14 }}
                    onClick={() => { setSelected(node.path); if (isDir) toggle(node.path); }}
                    onContextMenu={(e) => handleContextMenu(e, node)}
                >
                    {isDir ? (
                        <>
                            <ChevronRight size={14} class={clsx("text-neutral-400/70 mr-0.5 transition-transform", isExpanded && "rotate-90")} />
                            <Folder size={16} class="text-yellow-500 fill-yellow-500/20" />
                        </>
                    ) : (
                        <>
                            <div style={{ width: 14, display: 'inline-block' }}></div>
                            <File size={16} class="text-blue-400" />
                        </>
                    )}
                    <span class="ml-2 font-mono text-[12.5px] font-normal text-neutral-300">{node.name}</span>
                </div>
                {isDir && isExpanded && node.children && (
                    <ul>{node.children.map(c => renderNode(c, depth + 1))}</ul>
                )}
            </li>
        );
    };

    const filterTree = (node: TreeNode, query: string): TreeNode | null => {
        if (!query) return node;
        const matchesSelf = node.name.toLowerCase().includes(query.toLowerCase());
        if (node.type === 'file') return matchesSelf ? node : null;

        const filteredChildren = (node.children || [])
            .map(c => filterTree(c, query))
            .filter((c): c is TreeNode => c !== null);

        if (matchesSelf || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
        }
        return null;
    };

    const treeToRender = tree ? filterTree(tree, searchQuery) : null;

    return (
        <div class="h-full" onClick={() => setContextMenu(null)}>
            <ul class="py-2">{treeToRender && renderNode(treeToRender)}</ul>
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onAction={handleAction}
                />
            )}
        </div>
    );
}
