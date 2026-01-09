
import { useState, useEffect } from 'preact/hooks';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Graph } from './components/Graph';
import { FileTree } from './components/FileTree';
import { GenerateModal } from './components/GenerateModal';
import { callApi } from './api';
import { Plus } from 'lucide-preact';
import { Layout, Input, Button, Modal, Toast, CodeHighlight } from '@douyinfe/semi-ui';

const { Header, Content, Sider } = Layout;

// Helper to determine language from extension
const getLanguage = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': case 'tsx': return 'typescript';
    case 'js': case 'jsx': return 'javascript';
    case 'json': return 'json';
    case 'css': return 'css';
    case 'html': return 'html';
    case 'md': return 'markdown';
    default: return 'plaintext';
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState('files');
  const [tree, setTree] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genModal, setGenModal] = useState<{ open: boolean; path: string }>({ open: false, path: '' });

  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);

  const refreshTree = () => callApi('tree').then(res => setTree(res.tree)).catch(console.error);
  const openGenerate = (path: string = '') => setGenModal({ open: true, path });
  const closeGenerate = () => setGenModal({ ...genModal, open: false });

  useEffect(() => {
    refreshTree();
    const handleUpdate = (e: any) => setTree(e.detail.tree);
    window.addEventListener('hono_di:update', handleUpdate);
    return () => window.removeEventListener('hono_di:update', handleUpdate);
  }, []);

  const handleClientGenerate = async () => {
    Modal.confirm({
      title: 'Generate Client',
      content: 'Generate src/client.ts based on current controllers?',
      onOk: async () => {
        try {
          const res = await callApi('client/generate', {});
          if (res.success) Toast.success(`Client generated at ${res.path}`);
        } catch (e: any) {
          Toast.error(`Error: ${e.message}`);
        }
      }
    });
  };

  const startResizing = (e: MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        setSidebarWidth(e.clientX);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleFileSelect = async (node: any) => {
    try {
      console.log('Fetching file:', node.path);
      const res = await callApi('file/read', { path: node.path });
      if (!res || (!res.content && res.content !== '')) {
        console.warn('API returned empty content or structure mismatch:', res);
      }
      setSelectedFile({ name: node.name, content: res.content });
    } catch (error: any) {
      console.error('File read error:', error);
      Toast.error(`Failed to read file: ${error.message}`);
    }
  };


  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider style={{ backgroundColor: 'var(--semi-color-bg-1)' }}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </Sider>
      <Layout>
        {activeTab === 'files' && (
          <>
            <Header style={{ backgroundColor: 'var(--semi-color-bg-1)', borderBottom: '1px solid var(--semi-color-border)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--semi-color-primary)', boxShadow: '0 0 8px var(--semi-color-primary)' }}></div>
                PROJECT EXPLORER
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Input
                  prefix={<i className="i-lucide-search" />}
                  value={searchQuery}
                  onChange={(v) => setSearchQuery(v)}
                  placeholder="Search files..."
                  style={{ width: 220 }}
                />
                <Button onClick={handleClientGenerate}>Client</Button>
                <Button theme='solid' type='primary' icon={<Plus size={16} />} onClick={() => openGenerate()}>Generate</Button>
              </div>
            </Header>
            <Content style={{ backgroundColor: 'var(--semi-color-bg-0)', overflow: 'hidden', display: 'flex', height: 'calc(100vh - 60px)' }}>

              {/* File Tree Panel */}
              <div style={{ width: sidebarWidth, minWidth: 200, maxWidth: 600, borderRight: '1px solid var(--semi-color-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                  <FileTree
                    tree={tree}
                    onRefresh={refreshTree}
                    onGenerate={(path) => openGenerate(path)}
                    searchQuery={searchQuery}
                    onSelect={handleFileSelect}
                  />
                </div>
              </div>

              {/* Resize Handle */}
              <div
                style={{ width: 4, cursor: 'col-resize', backgroundColor: 'transparent', transition: 'background .2s' }}
                className="hover:bg-blue-500/20 active:bg-blue-500/40"
                onMouseDown={startResizing as any}
              ></div>

              {/* Content Panel */}
              <div style={{ flex: 1, overflow: 'auto', padding: 0, backgroundColor: 'var(--semi-color-bg-0)' }}>
                {selectedFile ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--semi-color-border)', fontSize: 13, color: 'var(--semi-color-text-2)', backgroundColor: 'var(--semi-color-bg-1)' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                      <CodeHighlight
                        key={selectedFile.name}
                        language={getLanguage(selectedFile.name)}
                        style={{ height: '100%', margin: 0, backgroundColor: 'transparent' }}
                        code={selectedFile.content}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--semi-color-text-2)' }}>
                    Select a file to view content
                  </div>
                )}
              </div>
            </Content>
          </>
        )}

        {activeTab === 'graph' && (
          <Content style={{ height: '100%', backgroundColor: 'var(--semi-color-bg-0)' }}>
            <Graph />
          </Content>
        )}

        {activeTab === 'dashboard' && (
          <Content style={{ height: '100%', overflowY: 'auto' }}>
            <Dashboard />
          </Content>
        )}
      </Layout>

      <GenerateModal
        isOpen={genModal.open}
        onClose={closeGenerate}
        initialPath={genModal.path}
        onSuccess={refreshTree}
      />
    </Layout>
  );
}
