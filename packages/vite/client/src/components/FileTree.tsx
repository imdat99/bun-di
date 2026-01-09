
import { useState, useMemo } from 'preact/hooks';
import { Tree, Modal, Form, Toast } from '@douyinfe/semi-ui';
import { callApi } from '../api';
import { File as FileIcon, Folder } from 'lucide-preact';
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
    onSelect?: (node: TreeNode) => void;
    searchQuery: string;
}

export function FileTree({ tree, onRefresh, onGenerate, onSelect, searchQuery }: FileTreeProps) {
    const [contextMenuPos, setContextMenuPos] = useState<{ x: number, y: number, node: TreeNode } | null>(null);
    const [modalState, setModalState] = useState<{
        visible: boolean;
        title: string;
        type: 'input';
        initialValue?: string;
        label?: string;
        placeholder?: string;
        onOk: (val: string) => Promise<void>;
    } | null>(null);

    const filteredTree = useMemo(() => {
        if (!tree) return null;

        const filterNode = (node: TreeNode): TreeNode | null => {
            if (!searchQuery) return node;
            const matchesSelf = node.name.toLowerCase().includes(searchQuery.toLowerCase());
            if (node.type === 'file') return matchesSelf ? node : null;

            const filteredChildren = (node.children || [])
                .map(filterNode)
                .filter((c): c is TreeNode => c !== null);

            if (matchesSelf || filteredChildren.length > 0) {
                return { ...node, children: filteredChildren };
            }
            return null;
        };

        return filterNode(tree);
    }, [tree, searchQuery]);

    const treeData = useMemo(() => {
        if (!filteredTree) return [];
        const mapNode = (node: TreeNode): any => ({
            key: node.path,
            label: <span>&nbsp;{node.name}</span>,
            icon: node.type === 'dir' ? <Folder size={16} /> : <FileIcon size={16} />,
            children: node.children ? node.children.map(mapNode) : undefined,
            data: node
        });
        return [mapNode(filteredTree)];
    }, [filteredTree]);

    const handleContextMenu = (e: MouseEvent, node: TreeNode) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPos({ x: e.clientX, y: e.clientY, node });
    };

    const handleAction = (action: string) => {
        if (!contextMenuPos) return;
        const { node } = contextMenuPos;
        setContextMenuPos(null);

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

    const promptCreate = (node: TreeNode, type: 'file' | 'dir') => {
        const isDir = type === 'dir';
        const base = node.type === 'dir' ? node.path : node.path.split('/').slice(0, -1).join('/');

        setModalState({
            visible: true,
            type: 'input',
            title: isDir ? 'New Folder' : 'New File',
            label: `Inside: /${base}`,
            placeholder: isDir ? 'folder_name' : 'file.ts',
            onOk: async (name) => {
                if (!name) return;
                const fullPath = base ? `${base}/${name}` : name;
                try {
                    await callApi(isDir ? 'dir/create' : 'file/create', { path: fullPath });
                    onRefresh();
                } catch (e: any) { Toast.error(e.message); }
            }
        });
    };

    const promptRename = (node: TreeNode) => {
        setModalState({
            visible: true,
            type: 'input',
            title: 'Rename',
            initialValue: node.name,
            onOk: async (newName) => {
                if (!newName || newName === node.name) return;
                try {
                    const oldPath = node.path;
                    const base = oldPath.split('/').slice(0, -1).join('/');
                    const newPath = base ? `${base}/${newName}` : newName;
                    await callApi('move', { from: oldPath, to: newPath });
                    onRefresh();
                } catch (e: any) { Toast.error(e.message); }
            }
        });
    };

    const confirmDelete = (node: TreeNode) => {
        Modal.confirm({
            title: `Delete ${node.name}?`,
            content: 'This action cannot be undone.',
            onOk: async () => {
                try {
                    await callApi('delete', { path: node.path });
                    onRefresh();
                } catch (e: any) { Toast.error(e.message); }
            },
            okButtonProps: { type: 'danger' }
        });
    };

    return (
        <div style={{ height: '100%' }} onContextMenu={(e) => e.preventDefault()} onClick={() => setContextMenuPos(null)}>
            <Tree
                treeData={treeData}
                defaultExpandAll
                motion
                defaultExpandedKeys={[treeData.length > 0 ? treeData[0].key : '']}
                renderLabel={(label, data: any) => (
                    <div
                        onContextMenu={(e) => handleContextMenu(e, data.data)}
                        onClick={() => {
                            if (data.data.type === 'file' && onSelect) {
                                onSelect(data.data);
                            }
                        }}
                        style={{ flex: 1, cursor: 'pointer' }}
                    >
                        {label}
                    </div>
                )}
            />

            {contextMenuPos && (
                <ContextMenu
                    x={contextMenuPos.x}
                    y={contextMenuPos.y}
                    onClose={() => setContextMenuPos(null)}
                    onAction={handleAction}
                />
            )}

            {/* Reusable Input Modal */}
            <Modal
                title={modalState?.title}
                visible={modalState?.visible}
                onCancel={() => setModalState(null)}
                // destroyOnClose not supported in this version/binding
                onOk={() => {
                    const form = document.getElementById('file-tree-form') as HTMLFormElement;
                    if (form) form.requestSubmit();
                }}
            >
                {modalState && (
                    <Form
                        id="file-tree-form"
                        initValues={{ value: modalState.initialValue || '' }}
                        onSubmit={async (values) => {
                            await modalState.onOk(values.value);
                            setModalState(null);
                        }}
                    >
                        <Form.Input
                            field='value'
                            label={modalState.label}
                            placeholder={modalState.placeholder}
                            autofocus
                            rules={[{ required: true, message: 'This field is required' }]}
                        />
                    </Form>
                )}
            </Modal>
        </div>
    );
}
