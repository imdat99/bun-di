
import { useRef, useEffect } from 'preact/hooks';
import { FilePlus, Edit, Trash2 } from 'lucide-preact';

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
            className="fixed z-50 w-48 bg-[#27272a] border border-[#3f3f46] rounded-md shadow-xl py-1"
            style={{ top: y, left: x }}
        >
            <button
                onClick={() => onAction('new-file')}
                className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-[#3f3f46] hover:text-white flex items-center gap-2"
            >
                <FilePlus size={14} /> New File
            </button>
            <button
                onClick={() => onAction('new-folder')}
                className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-[#3f3f46] hover:text-white flex items-center gap-2"
            >
                <FilePlus size={14} /> New Folder
            </button>
            <div className="h-px bg-[#3f3f46] my-1 mx-2" />
            <button
                onClick={() => onAction('generate')}
                className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-[#3f3f46] hover:text-white flex items-center gap-2"
            >
                <FilePlus size={14} /> Generate...
            </button>
            <div className="h-px bg-[#3f3f46] my-1 mx-2" />
            <button
                onClick={() => onAction('rename')}
                className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-[#3f3f46] hover:text-white flex items-center gap-2"
            >
                <Edit size={14} /> Rename
            </button>
            <button
                onClick={() => onAction('delete')}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[#3f3f46] hover:text-red-300 flex items-center gap-2"
            >
                <Trash2 size={14} /> Delete
            </button>
        </div>
    );
}
