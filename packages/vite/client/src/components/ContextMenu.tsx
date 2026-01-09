
import { useRef, useEffect } from 'preact/hooks';
import { FilePlus, Edit, Trash2, FolderPlus, Zap } from 'lucide-preact';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onAction: (action: string) => void;
}

export function ContextMenu({ x, y, onClose, onAction }: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="fixed z-[2000] min-w-[160px] rounded-md shadow-xl py-1 font-sans text-[13px]"
            style={{
                top: y,
                left: x,
                backgroundColor: 'var(--semi-color-bg-3)',
                border: '1px solid var(--semi-color-border)',
                color: 'var(--semi-color-text-0)'
            }}
        >
            <div
                onClick={() => onAction('new-file')}
                className="w-full text-left px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-[var(--semi-color-fill-0)] transition-colors"
            >
                <FilePlus size={14} /> New File
            </div>
            <div
                onClick={() => onAction('new-folder')}
                className="w-full text-left px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-[var(--semi-color-fill-0)] transition-colors"
            >
                <FolderPlus size={14} /> New Folder
            </div>
            <div className="h-px bg-[var(--semi-color-border)] my-1 mx-2" />
            <div
                onClick={() => onAction('generate')}
                className="w-full text-left px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-[var(--semi-color-fill-0)] transition-colors"
            >
                <Zap size={14} /> Generate...
            </div>
            <div className="h-px bg-[var(--semi-color-border)] my-1 mx-2" />
            <div
                onClick={() => onAction('rename')}
                className="w-full text-left px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-[var(--semi-color-fill-0)] transition-colors"
            >
                <Edit size={14} /> Rename
            </div>
            <div
                onClick={() => onAction('delete')}
                className="w-full text-left px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-[var(--semi-color-fill-0)] transition-colors text-red-500 hover:text-red-600"
            >
                <Trash2 size={14} /> Delete
            </div>
        </div>
    );
}
