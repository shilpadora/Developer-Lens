
import React, { useState, useEffect } from 'react';
import { 
  Plus, Github, RefreshCw, LayoutDashboard, Share2, Database, BarChart2, Zap, Layers, Menu, X, Trash2, Key
} from 'lucide-react';
import { RepoProject, FileNode, ViewType, GitStats, Entity, AnalysisResult } from './types';
import { GitHubService } from './services/githubService';
import { ParserService } from './services/parserService';
import { AnalysisService } from './services/analysisService';
import MindMap from './components/MindMap';
import AnalyticsView from './components/AnalyticsView';
import ErDiagram from './components/ErDiagram';
import InsightsView from './components/InsightsView';

const App: React.FC = () => {
  const [projects, setProjects] = useState<RepoProject[]>([]);
  const [activeProject, setActiveProject] = useState<RepoProject | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('mindmap');
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [isLanding, setIsLanding] = useState(true);

  // Project Data
  const [tree, setTree] = useState<FileNode[]>([]);
  const [stats, setStats] = useState<GitStats | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [aiResult, setAiResult] = useState<AnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('devlens_projects');
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  const saveProjects = (newProjects: RepoProject[]) => {
    setProjects(newProjects);
    localStorage.setItem('devlens_projects', JSON.stringify(newProjects));
  };

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    const token = formData.get('token') as string;

    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return alert('Invalid GitHub URL');

    const owner = match[1];
    const repo = match[2].replace('.git', '');

    const newProject: RepoProject = {
      id: Date.now().toString(),
      name: repo,
      owner,
      url,
      token,
      lastSync: Date.now()
    };

    saveProjects([...projects, newProject]);
    setShowImport(false);
    selectProject(newProject);
  };

  const selectProject = async (project: RepoProject) => {
    setLoading(true);
    setActiveProject(project);
    try {
      const treeData = await GitHubService.fetchTree(project.owner, project.name, project.token);
      setTree(treeData);
      
      const statsData = await GitHubService.fetchStats(project.owner, project.name, project.token);
      setStats(statsData);

      // Attempt schema parsing from common files
      const possibleModels = ['models.py', 'schema.prisma', 'schema.sql', 'models/index.js'];
      let allEntities: Entity[] = [];
      
      const flattenTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.reduce((acc, n) => [...acc, n, ...(n.children ? flattenTree(n.children) : [])], [] as FileNode[]);
      };

      const files = flattenTree(treeData).filter(n => n.type === 'blob');
      
      for (const f of files) {
        if (f.name === 'schema.prisma') {
          const content = await GitHubService.getFileContent(project.owner, project.name, f.path, project.token);
          allEntities = [...allEntities, ...ParserService.parsePrisma(content)];
        } else if (f.name === 'models.py') {
          const content = await GitHubService.getFileContent(project.owner, project.name, f.path, project.token);
          allEntities = [...allEntities, ...ParserService.parsePythonModels(content)];
        }
      }
      setEntities(allEntities);
      setAiResult(null); // Reset AI result for new project

    } catch (error) {
      console.error(error);
      alert('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const runAiAnalysis = async () => {
    if (!activeProject || !tree.length) return;
    setAiLoading(true);
    try {
      const result = await AnalysisService.analyzeRepo(activeProject.name, tree);
      setAiResult(result);
    } catch (error) {
      console.error(error);
      alert('AI analysis failed. Check console for details.');
    } finally {
      setAiLoading(false);
    }
  };

  if (isLanding) {
    return (
      <div className="h-screen w-full relative flex flex-col items-center justify-center bg-slate-900 overflow-hidden">
        <div className="blob-bg top-0 left-0"></div>
        <div className="blob-bg bottom-0 right-0" style={{ animationDelay: '-5s' }}></div>
        
        <div className="z-10 text-center space-y-8 max-w-2xl px-6">
          <div className="inline-block p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 mb-4">
            <Share2 className="text-emerald-500 w-12 h-12" />
          </div>
          <h1 className="text-7xl font-black text-white tracking-tighter uppercase leading-none">
            Developer <span className="text-emerald-500">Lens</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium leading-relaxed">
            Privacy-first repository visualization. Import any GitHub project and generate instant semantic maps, database schemas, and AI-powered insights.
          </p>
          <div className="pt-8">
            <button 
              onClick={() => setIsLanding(false)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 px-10 py-5 rounded-2xl font-black text-xl uppercase tracking-widest transition-all hover:scale-105 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
            >
              Launch Application
            </button>
          </div>
          <div className="text-slate-500 text-sm flex items-center justify-center gap-6 pt-12">
            <div className="flex items-center gap-2"><Github size={16} /> Open Source DNA</div>
            <div className="flex items-center gap-2"><Zap size={16} /> Gemini Pro Driven</div>
            <div className="flex items-center gap-2"><Layers size={16} /> No Login Required</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-slate-900 text-slate-50 overflow-hidden">
      {/* Sidebar */}
      <nav className="w-16 md:w-20 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-8 gap-10">
        <div className="text-emerald-500 cursor-pointer" onClick={() => setIsLanding(true)}>
          <Share2 size={28} />
        </div>
        
        <div className="flex flex-col gap-6 items-center flex-1">
          <button 
            onClick={() => setActiveView('mindmap')}
            className={`p-3 rounded-xl transition-all ${activeView === 'mindmap' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={24} />
          </button>
          <button 
            onClick={() => setActiveView('er')}
            className={`p-3 rounded-xl transition-all ${activeView === 'er' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Database size={24} />
          </button>
          <button 
            onClick={() => setActiveView('analytics')}
            className={`p-3 rounded-xl transition-all ${activeView === 'analytics' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <BarChart2 size={24} />
          </button>
          <button 
            onClick={() => { setActiveView('insights'); if(!aiResult && !aiLoading) runAiAnalysis(); }}
            className={`p-3 rounded-xl transition-all ${activeView === 'insights' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Zap size={24} />
          </button>
        </div>

        <button 
          onClick={() => setShowImport(true)}
          className="p-3 bg-slate-800 rounded-xl text-emerald-500 hover:bg-slate-700 transition-colors"
        >
          <Plus size={24} />
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {activeProject ? (
              <>
                <h2 className="text-xl font-black uppercase tracking-tight truncate">{activeProject.name}</h2>
                <div className="h-4 w-px bg-slate-700"></div>
                <div className="text-xs font-mono text-slate-500">{activeProject.owner}</div>
              </>
            ) : (
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-600">No Project Selected</h2>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {activeProject && (
              <button 
                onClick={() => selectProject(activeProject)}
                className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 hover:text-emerald-500 transition-colors"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Repo
              </button>
            )}
            <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-400">
              {activeView.toUpperCase()}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-hidden relative">
          {!activeProject ? (
            <div className="h-full flex flex-col items-center justify-center bg-slate-900/50">
               <div className="max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                  {projects.map(p => (
                    <div 
                      key={p.id}
                      className="group bg-slate-800 border border-slate-700 p-6 rounded-2xl hover:border-emerald-500/50 transition-all cursor-pointer relative"
                      onClick={() => selectProject(p)}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); saveProjects(projects.filter(pr => pr.id !== p.id)); }}
                        className="absolute top-4 right-4 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                      <Github className="mb-4 text-emerald-500 opacity-50" size={32} />
                      <h3 className="font-bold text-lg mb-1 truncate">{p.name}</h3>
                      <p className="text-slate-500 text-sm mb-4">{p.owner}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest pt-4 border-t border-slate-700">
                        <span>Last Sync</span>
                        <span>{new Date(p.lastSync).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  <div 
                    onClick={() => setShowImport(true)}
                    className="border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center p-8 hover:bg-slate-800/50 hover:border-emerald-500/30 transition-all cursor-pointer group"
                  >
                    <Plus className="text-slate-600 group-hover:text-emerald-500 mb-2" size={32} />
                    <span className="text-slate-500 font-bold text-sm uppercase tracking-widest">Connect Repo</span>
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-full w-full">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-1 w-32 bg-slate-800 overflow-hidden rounded-full">
                    <div className="h-full bg-emerald-500 animate-[loading_2s_infinite]"></div>
                  </div>
                  <style>{`@keyframes loading { from { transform: translateX(-100%); } to { transform: translateX(100%); } }`}</style>
                  <p className="text-xs uppercase font-black tracking-widest text-slate-500">Scanning Repository Trees...</p>
                </div>
              ) : (
                <>
                  {activeView === 'mindmap' && <div className="h-full p-6"><MindMap data={tree} /></div>}
                  {activeView === 'analytics' && stats && <AnalyticsView stats={stats} />}
                  {activeView === 'er' && <ErDiagram entities={entities} />}
                  {activeView === 'insights' && <InsightsView data={aiResult} loading={aiLoading} />}
                </>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Connect Project</h3>
                <p className="text-slate-500 text-sm">Analyze public or private GitHub repositories</p>
              </div>
              <button onClick={() => setShowImport(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleImport} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Repository URL</label>
                <div className="relative">
                  <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    name="url"
                    type="url" 
                    placeholder="https://github.com/owner/repo"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-emerald-500 transition-colors text-slate-200"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                  Personal Access Token (Optional)
                  <span className="text-[10px] lowercase text-slate-600 normal-case">Required for private repos</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    name="token"
                    type="password" 
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-emerald-500 transition-colors text-slate-200"
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black py-4 rounded-xl uppercase tracking-widest transition-all shadow-lg"
              >
                Import Repository
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
