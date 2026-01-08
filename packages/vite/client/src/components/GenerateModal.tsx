
import { useState, useEffect } from 'preact/hooks';
import { X, Loader2 } from 'lucide-preact';
import { callApi } from '../api';
import Swal from 'sweetalert2';

interface GenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialPath: string;
    onSuccess: () => void;
}

const ALL_TYPES = ['module', 'controller', 'service', 'provider', 'class', 'interface', 'pipe', 'guard', 'filter', 'interceptor', 'decorator'];

export function GenerateModal({ isOpen, onClose, initialPath, onSuccess }: GenerateModalProps) {
    if (!isOpen) return null;

    const [types, setTypes] = useState<Set<string>>(new Set(['controller']));
    const [name, setName] = useState('');
    const [pathVal, setPathVal] = useState(initialPath);
    const [opts, setOpts] = useState({ flat: false, spec: true, skipImport: false, force: false, dryRun: false });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPathVal(initialPath);
            setName('');
            setTypes(new Set(['controller']));
            setOpts({ flat: false, spec: true, skipImport: false, force: false, dryRun: false });
        }
    }, [isOpen, initialPath]);

    const toggleType = (t: string) => {
        const next = new Set(types);
        if (next.has(t)) next.delete(t); else next.add(t);
        setTypes(next);
    };

    const toggleOpt = (k: keyof typeof opts) => setOpts({ ...opts, [k]: !opts[k] });

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!name || types.size === 0) return;

        setLoading(true);
        try {
            const res = await callApi('generate', {
                type: Array.from(types),
                name,
                path: pathVal,
                ...opts
            });

            if (res.success) {
                Swal.fire({
                    toast: true, position: 'bottom-end', icon: 'success',
                    title: `Generated ${res.operations.length} files`,
                    showConfirmButton: false, timer: 3000,
                    background: '#27272a', color: '#fff'
                });
                onSuccess();
                onClose();
            } else {
                Swal.fire({ title: 'Error', text: res.errors?.join('\n'), icon: 'error', background: '#27272a', color: '#fff' });
            }
        } catch (err: any) {
            Swal.fire({ title: 'Error', text: err.message, icon: 'error', background: '#27272a', color: '#fff' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1f1f23] border border-[#3f3f46] rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <header className="px-4 py-3 border-b border-[#3f3f46] flex items-center justify-between bg-[#27272a]">
                    <h3 className="font-semibold text-white">Generate Resource</h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Resource Types</label>
                        <div className="grid grid-cols-4 gap-2">
                            {ALL_TYPES.map(t => (
                                <label key={t} className={`
                                    border rounded-md p-2 cursor-pointer flex items-center gap-2 transition-all select-none
                                    ${types.has(t) ? 'bg-accent/10 border-accent' : 'bg-[#18181b] border-[#27272a] hover:bg-[#27272a]'}
                                `}>
                                    <input type="checkbox" checked={types.has(t)} onChange={() => toggleType(t)} className="accent-accent w-3.5 h-3.5" />
                                    <span className="text-xs font-medium capitalize text-neutral-200">{t}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName((e.target as HTMLInputElement).value)}
                                placeholder="e.g. auth/user"
                                autoFocus
                                className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Target Path</label>
                            <input
                                type="text"
                                value={pathVal}
                                onChange={(e) => setPathVal((e.target as HTMLInputElement).value)}
                                className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 select-none">
                            <input type="checkbox" checked={opts.flat} onChange={() => toggleOpt('flat')} className="accent-accent" />
                            Flat <span className="text-neutral-500">(No sub-folder)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 select-none">
                            <input type="checkbox" checked={opts.spec} onChange={() => toggleOpt('spec')} className="accent-accent" />
                            Spec
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 select-none">
                            <input type="checkbox" checked={opts.skipImport} onChange={() => toggleOpt('skipImport')} className="accent-accent" />
                            Skip Import
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 select-none">
                            <input type="checkbox" checked={opts.force} onChange={() => toggleOpt('force')} className="accent-accent" />
                            Force
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-400 select-none font-medium">
                            <input type="checkbox" checked={opts.dryRun} onChange={() => toggleOpt('dryRun')} className="accent-amber-400" />
                            Dry Run
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#3f3f46] mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-300 hover:text-white hover:bg-[#3f3f46] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name}
                            className="px-4 py-1.5 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            Generate
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
