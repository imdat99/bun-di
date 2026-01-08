
import { useState, useEffect } from 'preact/hooks';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Graph } from './components/Graph';
import { FileTree } from './components/FileTree';
import { GenerateModal } from './components/GenerateModal';
import { callApi } from './api';
import { Plus } from 'lucide-preact';

export function App() {
  const [activeTab, setActiveTab] = useState('files');
  const [tree, setTree] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genModal, setGenModal] = useState<{ open: boolean; path: string }>({ open: false, path: '' });

  const refreshTree = () => callApi('tree').then(res => setTree(res.tree)).catch(console.error);

  const openGenerate = (path: string = '') => setGenModal({ open: true, path });
  const closeGenerate = () => setGenModal({ ...genModal, open: false });

  useEffect(() => {
    refreshTree();
    // Hot Reload Listener
    if (import.meta.hot) {
      import.meta.hot.on('hono_di:update', (d: any) => { setTree(d.tree); });
    }
  }, []);

  return (
    <div class="flex flex-1 overflow-hidden h-screen bg-root text-neutral-200 font-sans">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div class="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'files' && (
          <div class="flex flex-col w-full h-full">
            <header class="bg-header backdrop-blur-md px-5 h-[52px] flex items-center justify-between border-b border-border z-10">
              <div class="flex items-center gap-2 font-semibold text-sm tracking-tight">
                <div class="w-2 h-2 bg-accent rounded-full shadow-[0_0_12px_var(--accent)]"></div>
                PROJECT EXPLORER
              </div>
              <div class="flex items-center gap-3">
                <div class="relative flex items-center">
                  <svg class="absolute left-2.5 text-neutral-400 w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24">
                    <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" stroke-width="2" stroke="currentColor" fill="none" />
                  </svg>
                  <input
                    value={searchQuery}
                    onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                    class="bg-[#18181b] border border-[#27272a] text-neutral-200 rounded-md py-1.5 pl-8 pr-3 w-[220px] text-xs transition-all focus:border-accent focus:w-[280px] focus:outline-none placeholder:text-neutral-500"
                    placeholder="Search files..."
                  />
                </div>
                <button
                  onClick={() => openGenerate()}
                  class="bg-gradient-to-br from-accent to-accent-hover text-white px-4 py-1.5 rounded-md cursor-pointer text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus size={14} /> Generate
                </button>
              </div>
            </header>
            <div class="flex-1 overflow-y-auto">
              <FileTree tree={tree} onRefresh={refreshTree} onGenerate={(path) => openGenerate(path)} searchQuery={searchQuery} />
            </div>
          </div>
        )}
        {activeTab === 'graph' && <Graph />}
        {activeTab === 'dashboard' && <Dashboard />}

        <GenerateModal
          isOpen={genModal.open}
          onClose={closeGenerate}
          initialPath={genModal.path}
          onSuccess={refreshTree}
        />
      </div>
    </div>
  );
}
