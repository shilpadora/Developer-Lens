import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Github, RefreshCw, Network, Share2, Database, BarChart3, Zap, 
  X, Trash2, Key, Terminal, ChevronRight, ChevronLeft
} from 'lucide-react';
import { RepoProject, FileNode, ViewType, GitStats, Entity, AnalysisResult } from './types';
import { GitHubService } from './services/githubService';
import { ParserService } from './services/parserService';
import { AnalysisService } from './services/analysisService';
import MindMap from './components/MindMap';
import StatsDashboard from './components/StatsDashboard';
import SchemaGrid from './components/SchemaGrid';
import InsightsPanel from './components/InsightsPanel';
import NodeInfoPanel from './components/NodeInfoPanel';

const App: React.FC = () => {
  const [projects, setProjects] = useState<RepoProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>('topology');
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [panelMinimized, setPanelMinimized] = useState(false);

  const [tree, setTree] = useState<FileNode[]>([]);
  const [stats, setStats] = useState<GitStats | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [aiData, setAiData] = useState<AnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const activeProject = useMemo(() => projects.find(p => p.id === activeId), [projects, activeId]);

  useEffect(() => {
    const saved = localStorage.getItem('dl_projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setProjects(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  const save = (list: RepoProject[]) => {
    setProjects(list);
    localStorage.setItem('dl_projects', JSON.stringify(list));
  };

  const loadProject = async (p: RepoProject) => {
    setLoading(true);
    setActiveId(p.id);
    setSelectedNode(null);
    try {
      const { tree: t, defaultBranch } = await GitHubService.fetchTree(p.owner, p.name, p.token);
      setTree(t);
      const s = await GitHubService.fetchStats(p.owner, p.name, defaultBranch, p.token);
      setStats(s);

      const flat = (nodes: FileNode[]): FileNode[] => nodes.reduce((acc, n) => [...acc, n, ...(n.children ? flat(n.children) : [])], [] as FileNode[]);
      const files = flat(t);
      const allEnts: Entity[] = [];
      
      for (const f of files) {
        if (f.name === 'schema.prisma') {
          const c = await GitHubService.getFile(p.owner, p.name, f.path, p.token);
          allEnts.push(...ParserService.parseSchema(c, 'prisma'));
        } else if (f.name === 'models.py') {
          const c = await GitHubService.getFile(p.owner, p.name, f.path, p.token);
          allEnts.push(...ParserService.parseSchema(c, 'python'));
        }
      }
      setEntities(allEnts);
      setAiData(null); 
    } catch (e) {
      console.error(e);
      alert('Sync failed. Check repository visibility.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const url = (data.get('url') as string).trim();
    const token = (data.get('token') as string)?.trim();
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return alert('Invalid URL');

    const newProject: RepoProject = {
      id: Date.now().toString(),
      owner: match[1],
      name: match[2].replace('.git',''),
      url,
      token,
      lastSync: Date.now()
    };
    save([...projects, newProject]);
    setShowImport(false);
    loadProject(newProject);
  };

  const runAi = async () => {
    if (!activeProject || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await AnalysisService.analyze(activeProject.name, tree);
      setAiData(res);
    } catch (e) { console.error(e); } finally { setAiLoading(false); }
  };

  if (!launched) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-slate-950">
        <div className="blob top-0 left-0"></div>
        <div className="blob bottom-0 right-0" style={{ animationDelay: '-5s' }}></div>
        <div className="z-10 text-center max-w-2xl px-6 space-y-8">
          <div className="bg-emerald-500/10 p-4 rounded-3xl inline-block border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <Network className="text-emerald-500 w-12 h-12" />
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none text-slate-50">
            Developer <span className="text-emerald-500">Lens</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium leading-relaxed">
            High-fidelity repository topology, semantic mind maps, and AI-driven architectural audits.
          </p>
          <button onClick={() => setLaunched(true)} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-10 py-5 rounded-2xl font-black text-xl uppercase tracking-widest transition-all hover:scale-105 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            Launch Lens
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-slate-950 overflow-hidden text-slate-50">
      <nav className="w-20 border-r border-slate-800 flex flex-col items-center py-8 gap-10 bg-slate-950/80 backdrop-blur-xl z-50 shadow-2xl">
        <div className="text-emerald-500 cursor-pointer hover:scale-110 transition-transform" onClick={() => setLaunched(false)}>
          <Network size={32} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col gap-8 flex-1">
          <NavItem active={view === 'topology'} icon={<Share2 />} onClick={() => setView('topology')} label="Mind Map" />
          <NavItem active={view === 'schema'} icon={<Database />} onClick={() => setView('schema')} label="Schema" />
          <NavItem active={view === 'analytics'} icon={<BarChart3 />} onClick={() => setView('analytics')} label="Analytics" />
          <NavItem active={view === 'insights'} icon={<Zap />} onClick={() => { setView('insights'); if (!aiData) runAi(); }} label="AI Insights" />
        </div>
        <button onClick={() => setShowImport(true)} className="p-4 bg-slate-900 hover:bg-slate-800 rounded-2xl text-emerald-500 transition-all border border-slate-800 shadow-lg">
          <Plus size={24} />
        </button>
      </nav>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-6">
            {activeProject ? (
              <>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                   <Github size={24} className="text-slate-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight truncate max-w-md">{activeProject.name}</h2>
                  <p className="text-xs text-slate-500 font-mono tracking-wider">{activeProject.owner}</p>
                </div>
              </>
            ) : <h2 className="text-xl font-black uppercase tracking-tight text-slate-700">Connect a Project</h2>}
          </div>
          <div className="flex items-center gap-6">
            {activeProject && (
              <button onClick={() => loadProject(activeProject)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-all">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
              </button>
            )}
            <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest">
              {view === 'topology' ? 'Mind Map' : view} View
            </div>
          </div>
        </header>

        <div className="flex-1 flex relative overflow-hidden">
          <div className="flex-1 relative overflow-hidden">
            {!activeId ? (
              <div className="h-full flex items-center justify-center p-12 overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
                    {projects.map(p => (
                      <div key={p.id} onClick={() => loadProject(p)} className="group bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] hover:border-emerald-500/50 transition-all cursor-pointer relative shadow-xl">
                        <button onClick={(e) => { e.stopPropagation(); save(projects.filter(x => x.id !== p.id)); }} className="absolute top-6 right-6 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={18} />
                        </button>
                        <div className="bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/10 transition-all">
                          <Github className="text-slate-500 group-hover:text-emerald-500" size={32} />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-1 truncate">{p.name}</h3>
                        <p className="text-slate-500 text-sm font-medium mb-6">{p.owner}</p>
                        <div className="pt-6 border-t border-slate-800/50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-600">
                          <span>Last Sync</span>
                          <span>{new Date(p.lastSync).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setShowImport(true)} className="border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center p-8 hover:bg-slate-900/50 hover:border-emerald-500/30 transition-all group min-h-[250px]">
                      <Plus className="text-slate-700 group-hover:text-emerald-500 mb-4 transition-all" size={48} />
                      <span className="text-slate-600 font-black uppercase tracking-widest group-hover:text-slate-400">Import Repository</span>
                    </button>
                 </div>
              </div>
            ) : (
              <div className="h-full w-full">
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-6">
                    <div className="w-64 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div className="h-full bg-emerald-500 animate-[load_2s_infinite]"></div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Building Mind Map...</p>
                  </div>
                ) : (
                  <div className="h-full w-full relative">
                    {view === 'topology' && <MindMap data={tree} onNodeSelect={setSelectedNode} />}
                    {view === 'analytics' && stats && <StatsDashboard stats={stats} />}
                    {view === 'schema' && <SchemaGrid entities={entities} />}
                    {view === 'insights' && <InsightsPanel data={aiData} loading={aiLoading} />}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Persistent Side Panel for Node Properties (Approx 15-20% when expanded) */}
          {activeProject && (
            <div className={`transition-all duration-500 border-l border-slate-800 bg-slate-900/40 backdrop-blur-2xl relative flex flex-col h-full ${panelMinimized ? 'w-12' : 'w-[20%] min-w-[280px]'}`}>
               <button 
                  onClick={() => setPanelMinimized(!panelMinimized)}
                  className="absolute -left-4 top-10 bg-slate-800 border border-slate-700 p-1.5 rounded-full text-emerald-500 hover:text-white shadow-xl z-50 transition-all"
               >
                 {panelMinimized ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
               </button>
               
               {!panelMinimized ? (
                  <NodeInfoPanel 
                    node={selectedNode} 
                    project={activeProject} 
                    onClose={() => setSelectedNode(null)} 
                  />
               ) : (
                  <div className="flex flex-col items-center pt-20 gap-12 opacity-40">
                    <div className="rotate-90 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 whitespace-nowrap">Node Intelligence</div>
                    <Network className="text-emerald-500" size={24} />
                  </div>
               )}
            </div>
          )}
        </div>
      </main>

      {showImport && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-8">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden scale-in">
            <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-3xl font-black uppercase tracking-tighter">New Project</h3>
              <button onClick={() => setShowImport(false)} className="text-slate-600 hover:text-white p-2.5 rounded-full hover:bg-slate-800">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleImport} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">GitHub URL</label>
                <div className="relative">
                  <Terminal className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                  <input required name="url" placeholder="https://github.com/owner/repo" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-emerald-500 transition-all shadow-inner" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Personal Token (Optional)</label>
                <div className="relative">
                  <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                  <input name="token" type="password" placeholder="ghp_..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-emerald-500 shadow-inner" />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-6 rounded-2xl uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                Sync Pipeline
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem = ({ active, icon, onClick, label }: { active: boolean, icon: React.ReactNode, onClick: () => void, label: string }) => (
  <div className="relative group">
    <button onClick={onClick} className={`p-4 rounded-2xl transition-all ${active ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-110' : 'text-slate-500 hover:text-white hover:bg-slate-900 hover:scale-105'}`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
    </button>
    <div className="absolute left-20 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap shadow-xl border border-slate-700">
      {label}
    </div>
  </div>
);

export default App;