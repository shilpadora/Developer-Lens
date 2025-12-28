import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Github, RefreshCw, LayoutDashboard, Share2, Database, BarChart3, Zap, 
  Search, X, Trash2, Key, Terminal, Code2, Layers, Cpu, ShieldCheck, ExternalLink
} from 'lucide-react';
import { RepoProject, FileNode, ViewType, GitStats, Entity, AnalysisResult } from './types';
import { GitHubService } from './services/githubService';
import { ParserService } from './services/parserService';
import { AnalysisService } from './services/analysisService';
import TopologyMap from './components/TopologyMap';
import StatsDashboard from './components/StatsDashboard';
import SchemaGrid from './components/SchemaGrid';
import InsightsPanel from './components/InsightsPanel';

const App: React.FC = () => {
  const [projects, setProjects] = useState<RepoProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>('topology');
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [launched, setLaunched] = useState(false);

  // Data for active project
  const [tree, setTree] = useState<FileNode[]>([]);
  const [stats, setStats] = useState<GitStats | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [aiData, setAiData] = useState<AnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const activeProject = useMemo(() => projects.find(p => p.id === activeId), [projects, activeId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dl_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setProjects(parsed);
      }
    } catch (e) {
      console.error("Failed to load projects from storage", e);
    }
  }, []);

  const save = (list: RepoProject[]) => {
    setProjects(list);
    localStorage.setItem('dl_projects', JSON.stringify(list));
  };

  const loadProject = async (p: RepoProject) => {
    setLoading(true);
    setActiveId(p.id);
    try {
      const { tree: t, defaultBranch } = await GitHubService.fetchTree(p.owner, p.name, p.token);
      setTree(t);
      const s = await GitHubService.fetchStats(p.owner, p.name, defaultBranch, p.token);
      setStats(s);

      // Simple heuristic for schema detection
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
      setAiData(null); // Reset AI for new project
    } catch (e) {
      console.error(e);
      alert('Sync failed. Please check repository visibility and your token.');
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
    if (!match) return alert('Invalid GitHub URL');

    const newProject: RepoProject = {
      id: Date.now().toString(),
      owner: match[1],
      name: match[2].replace('.git',''),
      url,
      token,
      lastSync: Date.now()
    };
    const newList = [...projects, newProject];
    save(newList);
    setShowImport(false);
    loadProject(newProject);
  };

  const runAi = async () => {
    if (!activeProject || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await AnalysisService.analyze(activeProject.name, tree);
      setAiData(res);
    } catch (e) {
      console.error(e);
      alert('AI audit failed. Ensure your API key is configured.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!launched) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
        <div className="blob top-0 left-0"></div>
        <div className="blob bottom-0 right-0" style={{ animationDelay: '-5s' }}></div>
        <div className="z-10 text-center max-w-2xl px-6 space-y-8">
          <div className="bg-emerald-500/10 p-4 rounded-3xl inline-block border border-emerald-500/20">
            <Share2 className="text-emerald-500 w-12 h-12" />
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            Developer <span className="text-emerald-500">Lens</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium">
            High-fidelity repository topology, semantic mind maps, and AI-driven architectural audits. No login required. Privacy first.
          </p>
          <button 
            onClick={() => setLaunched(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-10 py-5 rounded-2xl font-black text-xl uppercase tracking-widest transition-transform hover:scale-105 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
          >
            Launch Lens
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <nav className="w-20 border-r border-slate-800 flex flex-col items-center py-8 gap-10 bg-slate-950 z-50 shadow-2xl">
        <div className="text-emerald-500 cursor-pointer" onClick={() => setLaunched(false)}>
          <Share2 size={32} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col gap-8 flex-1">
          <NavItem active={view === 'topology'} icon={<LayoutDashboard />} onClick={() => setView('topology')} label="Topology" />
          <NavItem active={view === 'schema'} icon={<Database />} onClick={() => setView('schema')} label="Schema" />
          <NavItem active={view === 'analytics'} icon={<BarChart3 />} onClick={() => setView('analytics')} label="Analytics" />
          <NavItem 
            active={view === 'insights'} 
            icon={<Zap />} 
            onClick={() => { setView('insights'); if (!aiData) runAi(); }} 
            label="AI Insights" 
          />
        </div>
        <button onClick={() => setShowImport(true)} className="p-4 bg-slate-800 rounded-2xl text-emerald-500 hover:bg-slate-700 transition-colors">
          <Plus size={24} />
        </button>
      </nav>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-6">
            {activeProject ? (
              <>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                   <Github size={24} className="text-slate-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight truncate max-w-md">{activeProject.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">{activeProject.owner}</p>
                </div>
              </>
            ) : (
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-700">Connect a Project</h2>
            )}
          </div>
          <div className="flex items-center gap-6">
            {activeProject && (
              <button 
                onClick={() => loadProject(activeProject)} 
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-colors"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
              </button>
            )}
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest">
              {view} View
            </div>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          {!activeId ? (
            <div className="h-full flex items-center justify-center p-12">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
                  {projects.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => loadProject(p)}
                      className="group bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:border-emerald-500/50 transition-all cursor-pointer relative shadow-lg"
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); save(projects.filter(x => x.id !== p.id)); }}
                        className="absolute top-6 right-6 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                      <Github className="text-emerald-500 mb-6 opacity-40 group-hover:opacity-100 transition-opacity" size={40} />
                      <h3 className="text-2xl font-black uppercase tracking-tighter mb-1 truncate">{p.name}</h3>
                      <p className="text-slate-500 text-sm font-medium mb-6">{p.owner}</p>
                      <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-600">
                        <span>Last Sync</span>
                        <span>{new Date(p.lastSync).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => setShowImport(true)}
                    className="border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center p-8 hover:bg-slate-900/50 hover:border-emerald-500/30 transition-all group"
                  >
                    <Plus className="text-slate-700 group-hover:text-emerald-500 mb-4" size={48} />
                    <span className="text-slate-600 font-black uppercase tracking-widest group-hover:text-slate-400">Import Repository</span>
                  </button>
               </div>
            </div>
          ) : (
            <div className="h-full w-full">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-6">
                  <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-[load_2s_infinite]"></div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 animate-pulse">Building Hierarchical Tree...</p>
                  <style>{`@keyframes load { from { transform: translateX(-100%); } to { transform: translateX(100%); } }`}</style>
                </div>
              ) : (
                <>
                  {view === 'topology' && <TopologyMap data={tree} />}
                  {view === 'analytics' && stats && <StatsDashboard stats={stats} />}
                  {view === 'schema' && <SchemaGrid entities={entities} />}
                  {view === 'insights' && <InsightsPanel data={aiData} loading={aiLoading} />}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showImport && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden scale-in animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter">New Project</h3>
                <p className="text-slate-500 font-medium">Connect via Public URL or Private Token</p>
              </div>
              <button onClick={() => setShowImport(false)} className="text-slate-600 hover:text-white p-2">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleImport} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">GitHub URL</label>
                <div className="relative">
                  <Terminal className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                  <input required name="url" placeholder="https://github.com/owner/repo" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Personal Token (Optional)</label>
                <div className="relative">
                  <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                  <input name="token" type="password" placeholder="ghp_..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-6 rounded-2xl uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all">
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
    <button 
      onClick={onClick}
      className={`p-4 rounded-2xl transition-all ${active ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'text-slate-500 hover:text-white hover:bg-slate-900'}`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
    </button>
    <div className="absolute left-20 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap shadow-xl">
      {label}
    </div>
  </div>
);

export default App;