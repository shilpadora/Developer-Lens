import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Github, RefreshCw, Share2, Database, BarChart3,
  X, Trash2, Terminal, ChevronRight, ChevronLeft, Search, Repeat, Lock, CheckCircle2, Layout, Shapes, ChevronUp, ChevronDown, ExternalLink, Zap, Brain, Code, User
} from 'lucide-react';
import { RepoProject, FileNode, ViewType, GitStats, Entity, AnalysisResult } from './types';
import { GitHubService } from './services/githubService';
import { ParserService } from './services/parserService';
import { AnalysisService } from './services/analysisService';
import MindMap from './components/MindMap';
import StatsDashboard from './components/StatsDashboard';
import SchemaGrid from './components/SchemaGrid';
import NodeInfoPanel from './components/NodeInfoPanel';
import StackView from './components/StackView';

const App: React.FC = () => {
  const [projects, setProjects] = useState<RepoProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>('stack');
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [globalToken, setGlobalToken] = useState<string>(() => localStorage.getItem('dl_github_token') || '');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const [tree, setTree] = useState<FileNode[]>([]);
  const [stats, setStats] = useState<GitStats | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [aiData, setAiData] = useState<AnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const activeProject = useMemo(() => projects.find(p => p.id === activeId), [projects, activeId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('access_token') || params.get('token');

    if (tokenFromUrl) {
      localStorage.setItem('dl_github_token', tokenFromUrl);
      setGlobalToken(tokenFromUrl);
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('access_token');
      window.history.replaceState({}, document.title, url.pathname);
      setLaunched(true);
      setShowImport(true);
    }

    const saved = localStorage.getItem('dl_projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setProjects(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  const saveToken = (token: string) => {
    const cleanToken = token.trim();
    if (!cleanToken) return;
    localStorage.setItem('dl_github_token', cleanToken);
    setGlobalToken(cleanToken);
    setShowTokenInput(false);
  };

  const updateCache = (id: string, updates: Partial<RepoProject>) => {
    const updated = projects.map(p => p.id === id ? { ...p, ...updates } : p);
    setProjects(updated);
    localStorage.setItem('dl_projects', JSON.stringify(updated));
  };

  const saveProjects = (newList: RepoProject[]) => {
    setProjects(newList);
    localStorage.setItem('dl_projects', JSON.stringify(newList));
  };

  const loadProject = async (p: RepoProject, forceSync = false) => {
    setActiveId(p.id);
    setSelectedNode(null);

    // Initial hydration from cache if available
    if (!forceSync && p.tree && p.stats) {
      setTree(p.tree);
      setStats(p.stats);
      setEntities(p.entities || []);
      setAiData(p.aiData || null);
      return;
    }

    setLoading(true);
    const tokenToUse = p.token || globalToken;
    try {
      const { tree: t, defaultBranch } = await GitHubService.fetchTree(p.owner, p.name, tokenToUse);
      const s = await GitHubService.fetchStats(p.owner, p.name, defaultBranch, tokenToUse);

      const flat = (nodes: FileNode[]): FileNode[] => nodes.reduce((acc, n) => [...acc, n, ...(n.children ? flat(n.children) : [])], [] as FileNode[]);
      const files = flat(t);
      const allEnts: Entity[] = [];

      for (const f of files) {
        if (f.name === 'schema.prisma') {
          const c = await GitHubService.getFile(p.owner, p.name, f.path, tokenToUse);
          allEnts.push(...ParserService.parseSchema(c, 'prisma'));
        } else if (f.name === 'models.py') {
          const c = await GitHubService.getFile(p.owner, p.name, f.path, tokenToUse);
          allEnts.push(...ParserService.parseSchema(c, 'python'));
        }
      }

      // Update project data
      const updatedProject: RepoProject = {
        ...p,
        tree: t,
        stats: s,
        entities: allEnts,
        lastSync: Date.now()
      };

      const newList = projects.map(x => x.id === p.id ? updatedProject : x);
      saveProjects(newList);

      setTree(t);
      setStats(s);
      setEntities(allEnts);
      setAiData(null);
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Synchronization failure. Verification of repository visibility or token may be required.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawUrl = (formData.get('url') as string).trim();
    const token = (formData.get('token') as string)?.trim();

    const cleanUrl = rawUrl.replace(/\/$/, '').replace('.git', '');
    const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/#? ]+)/);

    if (!match) return alert('Invalid GitHub URL');

    const owner = match[1];
    const repo = match[2];

    const newProject: RepoProject = {
      id: Date.now().toString(),
      owner,
      name: repo,
      url: cleanUrl,
      token: token || undefined,
      lastSync: Date.now()
    };

    const updated = [...projects, newProject];
    saveProjects(updated);
    setShowImport(false);
    loadProject(newProject, true);
  };

  const handleNodeSelect = useCallback((node: FileNode) => {
    setSelectedNode(node);
    setPanelMinimized(false);
  }, []);

  const runAi = async () => {
    if (!activeProject || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await AnalysisService.analyze(activeProject.name, tree);

      const updatedProject = { ...activeProject, aiData: res };
      const newList = projects.map(x => x.id === activeProject.id ? updatedProject : x);
      saveProjects(newList);

      setAiData(res);
    } catch (e) {
      console.error(e);
      alert('AI audit failed. Ensure your API key is correctly configured.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!launched) {
    return (
      <div className="h-screen w-full flex flex-col items-center relative overflow-y-auto bg-slate-950 px-6 custom-scrollbar pb-20">
        <div className="blob top-0 left-0"></div>
        <div className="blob bottom-0 right-0" style={{ animationDelay: '-5s' }}></div>

        <div className="z-10 text-center max-w-4xl space-y-4 pt-20">
          <LogoLarge />
          <h1 className="text-8xl font-black tracking-tighter uppercase leading-none text-slate-50">
            Developer <span className="text-emerald-500">Lens</span>
          </h1>
          <p className="text-emerald-500/80 text-2xl font-semibold tracking-tight">
            See the architecture behind the code.
          </p>
          <div className="pt-8 flex flex-col items-center gap-4">
            <button onClick={() => setLaunched(true)} className="group bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-12 py-5 rounded-2xl font-black text-xl uppercase tracking-widest transition-all hover:scale-105 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex items-center gap-3">
              Enter Workspace <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-24">
          <FeatureCard icon={<Share2 className="text-emerald-500" />} title="Mind Map Topology" desc="Navigate your codebase using an interactive D3 mind map. Deconstruct files into classes and functions with instant visual hierarchy." />
          <FeatureCard icon={<Database className="text-blue-500" />} title="Database Schemas" desc="Auto-scan and visualize ER diagrams from Prisma, Django, and SQL models. Track relationships and foreign key mappings effortlessly." />
          <FeatureCard icon={<Brain className="text-purple-500" />} title="AI Architecture Audit" desc="Get high-level structural audits powered by Gemini. Identify architectural debt, performance bottlenecks, and quality indices." />
          <FeatureCard icon={<BarChart3 className="text-orange-500" />} title="Velocity Analytics" desc="Monitor commit momentum, file complexity trends, and contributor impact through high-fidelity visual dashboards." />
          <FeatureCard icon={<Zap className="text-yellow-500" />} title="Intelligence Sidecar" desc="Deep dive into specific nodes with chat-based code intelligence. Ask Gemini about complex logic directly within the topology." />
          <FeatureCard icon={<Github className="text-white" />} title="GitHub Integration" desc="Seamlessly import public or private repositories using Personal Access Tokens for comprehensive metadata synchronization." />
        </div>

        <div className="mt-20 text-center">
          <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] opacity-50">Architectural Observer v1.9 // Google Gemini Integrated</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-slate-950 overflow-hidden text-slate-50">
      <nav className="w-20 border-r border-slate-800 flex flex-col items-center py-8 gap-10 bg-slate-950/80 backdrop-blur-xl z-50 shadow-2xl">
        <div
          className="cursor-pointer hover:scale-110 transition-transform"
          onClick={() => { setLaunched(false); setActiveId(null); setView('stack'); }}
          title="Return to Landing"
        >
          <LogoIcon />
        </div>
        <div className="flex flex-col gap-8 flex-1">
          <NavItem active={view === 'stack'} icon={<Layout />} onClick={() => setView('stack')} label="Tech Stack" />
          <NavItem active={view === 'topology'} icon={<Share2 />} onClick={() => setView('topology')} label="Mind Map" />
          <NavItem active={view === 'schema'} icon={<Database />} onClick={() => setView('schema')} label="Schema" />
          <NavItem active={view === 'analytics'} icon={<BarChart3 />} onClick={() => setView('analytics')} label="Analytics" />
        </div>
        <button onClick={() => setShowImport(true)} className="p-4 bg-slate-900 hover:bg-slate-800 rounded-2xl text-emerald-500 transition-all border border-slate-800 shadow-lg group relative">
          <Plus size={24} />
        </button>
      </nav>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity" onClick={() => { setLaunched(false); setActiveId(null); }}>
              <h1 className="text-lg font-black uppercase tracking-tight leading-none">Developer <span className="text-emerald-500">Lens</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Workspace Overview</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeProject ? (
              <div className="flex items-center gap-3 bg-slate-900/50 p-1.5 pl-4 rounded-2xl border border-slate-800 shadow-inner">
                <div className="flex flex-col mr-2">
                  <h3 className="text-xs font-black uppercase tracking-widest truncate max-w-[150px] text-emerald-500">{activeProject.name}</h3>
                  <span className="text-[9px] text-slate-600 font-mono tracking-wider opacity-60">@{activeProject.owner}</span>
                </div>
                <button
                  onClick={() => { setActiveId(null); setView('stack'); setSelectedNode(null); }}
                  className="px-3 py-2 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all flex items-center gap-2 group border border-slate-700 shadow-lg active:scale-95"
                >
                  <Repeat size={12} className="group-hover:rotate-180 transition-transform duration-500" /> Switch Repo
                </button>
              </div>
            ) : null}

            <div className="flex items-center gap-4">
              {activeProject && (
                <button onClick={() => loadProject(activeProject, true)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-all">
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                </button>
              )}
              <div className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                {view === 'topology' ? 'Mind Map' : view}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex relative overflow-hidden">
          <div className="flex-1 relative overflow-hidden z-10">
            {!activeId ? (
              <div className="h-full flex flex-col p-12 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl mx-auto">
                  {projects.map(p => (
                    <div key={p.id} onClick={() => loadProject(p)} className="group bg-slate-900/40 border border-slate-800 p-8 rounded-[2rem] hover:border-emerald-500/50 transition-all cursor-pointer relative shadow-xl">
                      <button onClick={(e) => { e.stopPropagation(); const rem = projects.filter(x => x.id !== p.id); setProjects(rem); localStorage.setItem('dl_projects', JSON.stringify(rem)); }} className="absolute top-6 right-6 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={18} />
                      </button>
                      <div className="bg-slate-800/50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/10 transition-all">
                        <Github className="text-slate-500 group-hover:text-emerald-500" size={32} />
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter mb-1 truncate">{p.name}</h3>
                      <p className="text-slate-500 text-sm font-medium mb-6">{p.owner}</p>
                      <div className="pt-6 border-t border-slate-800/50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-600">
                        <span>{p.tree ? 'Cached Snapshot' : 'Pending Sync'}</span>
                        <span>{new Date(p.lastSync).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setShowImport(true)} className="border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center p-8 hover:bg-slate-900/50 hover:border-emerald-500/30 transition-all group min-h-[250px]">
                    <Plus className="text-slate-700 group-hover:text-emerald-500 mb-4 transition-all" size={48} />
                    <span className="text-slate-600 font-black uppercase tracking-widest group-hover:text-slate-400">Scan New Repo</span>
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
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 animate-pulse">Building Intelligence Overlay...</p>
                  </div>
                ) : (
                  <div className="h-full w-full relative">
                    {view === 'stack' && <StackView aiData={aiData} stats={stats} aiLoading={aiLoading} project={activeProject} onTriggerAnalysis={runAi} />}
                    {view === 'topology' && <MindMap data={tree} project={activeProject} onNodeSelect={handleNodeSelect} />}
                    {view === 'analytics' && stats && <StatsDashboard stats={stats} />}
                    {view === 'schema' && <SchemaGrid entities={entities} />}
                  </div>
                )}
              </div>
            )}
          </div>

          {activeProject && view === 'topology' && (
            <aside className={`flex-shrink-0 transition-all duration-500 ease-in-out border-l border-slate-800 bg-slate-900/40 backdrop-blur-3xl relative flex flex-col h-full z-20 ${panelMinimized ? 'w-14' : 'w-[25%] min-w-[380px]'}`}>
              <button
                onClick={() => setPanelMinimized(!panelMinimized)}
                className="absolute -left-4 top-12 bg-slate-800 border border-slate-700 p-1.5 rounded-full text-emerald-500 hover:text-white shadow-2xl z-50 transition-transform active:scale-90"
              >
                {panelMinimized ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>

              <div className={`flex flex-col h-full overflow-hidden transition-opacity duration-300 ${panelMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <NodeInfoPanel
                    node={selectedNode}
                    project={activeProject}
                    onClose={() => setSelectedNode(null)}
                  />
                </div>

                <div className="border-t border-slate-800 bg-slate-950/40 p-6">
                  <button
                    onClick={() => setLegendOpen(!legendOpen)}
                    className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Shapes size={14} /> Structural Legend
                    </div>
                    {legendOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                  {legendOpen && (
                    <div className="mt-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-2.5">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2 border-b border-slate-800 pb-1">Complexity</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Low</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Med</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"></div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">High</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2 border-b border-slate-800 pb-1">Topology</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-3">
                          <div className="flex items-center gap-2">
                            <svg width="12" height="12" viewBox="-18 -14 36 28" className="text-emerald-500/30 overflow-visible"><path d="M-15,-11 L-15,11 L15,11 L15,-6 L4,-6 L0,-11 Z" fill="currentColor" stroke="currentColor" strokeWidth="3" /></svg>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Dir</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg width="12" height="12" viewBox="-12 -15 24 30" className="text-white/20 overflow-visible"><path d="M-10,-13 L6,-13 L10,-9 L10,13 L-10,13 Z" fill="currentColor" stroke="currentColor" strokeWidth="3" /></svg>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">File</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg width="12" height="12" viewBox="-14 -12 28 24" className="text-blue-500/40 overflow-visible"><path d="M-12,0 L-6,-10 L6,-10 L12,0 L6,10 L-6,10 Z" fill="currentColor" stroke="currentColor" strokeWidth="3" /></svg>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Class</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg width="12" height="12" viewBox="-18 -10 36 20" className="text-emerald-500/40 overflow-visible"><ellipse rx="15" ry="8" fill="currentColor" stroke="currentColor" strokeWidth="3" /></svg>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Fn</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {panelMinimized && (
                <div className="flex flex-col items-center pt-24 gap-16 opacity-30 select-none animate-in fade-in duration-300">
                  <div className="rotate-90 text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 whitespace-nowrap">Intelligence Sidecar</div>
                  <Search className="text-emerald-500" size={24} />
                </div>
              )}
            </aside>
          )}
        </div>
      </main>

      {showImport && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[2.5rem] shadow-[0_0_80px_rgba(16,185,129,0.1)] overflow-hidden my-auto">
            <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Import Pipeline</h3>
              <button onClick={() => setShowImport(false)} className="text-slate-600 hover:text-white p-2.5 rounded-full hover:bg-slate-800 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-10 space-y-8">
              <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-950">
                    <Github size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest">GitHub API Intelligence</h4>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">Connect for private repository access and high-volume API quotas.</p>
                  </div>
                </div>

                {globalToken ? (
                  <div className="flex items-center justify-between bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-emerald-500" size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Lens Connected</span>
                    </div>
                    <button onClick={() => { localStorage.removeItem('dl_github_token'); setGlobalToken(''); }} className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 transition-colors">Disconnect</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      onClick={() => {
                        window.open('https://github.com/settings/tokens/new?scopes=repo&description=Developer%20Lens%20Intelligence', '_blank');
                        setShowTokenInput(true);
                      }}
                      className="w-full bg-white hover:bg-slate-200 text-slate-950 font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all group"
                    >
                      <Lock size={16} /> Step 1: Authorize on GitHub <ExternalLink size={14} className="opacity-40 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {showTokenInput ? (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Step 2: Paste Generated Token</label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            placeholder="ghp_..."
                            value={tempToken}
                            onChange={(e) => setTempToken(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-500 transition-all font-mono"
                          />
                          <button
                            onClick={() => saveToken(tempToken)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                          >
                            Finish
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowTokenInput(true)}
                        className="w-full text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest py-2 transition-colors"
                      >
                        Already have a token?
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.5em] text-slate-600 bg-slate-900 px-4 uppercase">OR TARGET REPOSITORY</div>
              </div>

              <form onSubmit={handleImport} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">GitHub Repository URL</label>
                  <div className="relative">
                    <Terminal className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                    <input required name="url" placeholder="https://github.com/owner/repo" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-emerald-500 transition-all shadow-inner placeholder:text-slate-800 font-mono text-sm" />
                  </div>
                </div>

                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-6 rounded-2xl uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.01] active:scale-95 transition-all">
                  Initiate Lens Sync
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] hover:border-emerald-500/50 transition-all group flex flex-col gap-4 shadow-xl">
    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 w-fit group-hover:scale-110 transition-transform shadow-inner">
      {icon}
    </div>
    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-100">{title}</h3>
    <p className="text-slate-500 text-sm font-medium leading-relaxed">{desc}</p>
  </div>
);

const NavItem = ({ active, icon, onClick, label }: { active: boolean, icon: React.ReactNode, onClick: () => void, label: string }) => (
  <div className="relative group">
    <button onClick={onClick} className={`p-4 rounded-2xl transition-all ${active ? 'bg-emerald-500 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.3)] scale-110' : 'text-slate-500 hover:text-white hover:bg-slate-900 hover:scale-105'}`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
    </button>
    <div className="absolute left-20 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap shadow-2xl border border-slate-700 z-[60]">
      {label}
    </div>
  </div>
);

const LogoIcon = () => (
  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-lg group hover:bg-emerald-500/20 transition-all">
    <svg width="32" height="32" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="25" width="85" height="65" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="4" />
      <circle cx="85" cy="85" r="32" fill="#020617" stroke="#10b981" strokeWidth="6" />
      <path d="M70 85L80 95L100 75" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="105" y="105" width="6" height="24" rx="3" transform="rotate(-45 105 105)" fill="#10b981" />
    </svg>
  </div>
);

const LogoLarge = () => (
  <div className="relative w-48 h-48 mx-auto mb-8">
    <svg width="192" height="192" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="108" height="88" rx="14" fill="#1e293b" fillOpacity="0.8" stroke="#334155" strokeWidth="4" />
      <circle cx="24" cy="34" r="3.5" fill="#ef4444" />
      <circle cx="36" cy="34" r="3.5" fill="#f59e0b" />
      <circle cx="48" cy="34" r="3.5" fill="#10b981" />
      <circle cx="85" cy="85" r="38" fill="#020617" stroke="#10b981" strokeWidth="8" className="animate-pulse" />
      <path d="M70 85L80 95L100 75" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="110" y="110" width="8" height="35" rx="4" transform="rotate(-45 110 110)" fill="#10b981" />
    </svg>
  </div>
);

export default App;