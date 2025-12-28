import React, { useState, useEffect } from 'react';
import { 
  Info, GitBranch, Zap, MessageSquare, 
  Terminal, User, Activity, Sparkles, Send, Shapes, Network
} from 'lucide-react';
import { FileNode, RepoProject } from '../types';
import { GoogleGenAI } from '@google/genai';

interface Props {
  node: FileNode | null;
  project: RepoProject;
  onClose: () => void;
}

type Tab = 'basic' | 'git' | 'ai' | 'chat';

const NodeInfoPanel: React.FC<Props> = ({ node, project }) => {
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [gitAuthors, setGitAuthors] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);

  useEffect(() => {
    if (!node) return;
    setGitAuthors([]);
    setAiInsight('');
    setChatHistory([]);
    if (activeTab === 'git') fetchGit();
    if (activeTab === 'ai') fetchAi();
  }, [node, activeTab]);

  const fetchGit = async () => {
    if (!node) return;
    setLoading(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${project.owner}/${project.name}/commits?path=${node.path}`, {
        headers: project.token ? { 'Authorization': `token ${project.token}` } : {}
      });
      if (!res.ok) return;
      const data = await res.json();
      const counts: Record<string, { commits: number }> = {};
      
      data.slice(0, 15).forEach((c: any) => {
        const author = c.author?.login || 'anonymous';
        if (!counts[author]) counts[author] = { commits: 0 };
        counts[author].commits += 1;
      });
      setGitAuthors(Object.entries(counts).map(([name, stats]) => ({ name, ...stats })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchAi = async () => {
    if (!node) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this node in ${project.name}: ${node.path}. Complexity: ${node.complexity}. Provide a technical summary of its purpose.`
      });
      setAiInsight(response.text || 'No insights available.');
    } catch (e) { setAiInsight('AI diagnostic failed.'); } finally { setLoading(false); }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !node) return;
    const msg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chat = ai.chats.create({ model: 'gemini-3-flash-preview' });
      const response = await chat.sendMessage({ message: `Node Context: ${node.path}. User query: ${msg}` });
      setChatHistory(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', text: 'Diagnostic link severed.' }]);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 overflow-hidden">
      {/* Visual Legend Header */}
      <div className="p-5 bg-slate-950/30 border-b border-slate-800">
        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/80 mb-4 flex items-center gap-2">
           <Shapes size={10}/> Semantic Legend
        </h4>
        <div className="grid grid-cols-3 gap-3">
           <LegendIcon color="bg-emerald-500" label="Opti" shape="rect" desc="File"/>
           <LegendIcon color="bg-orange-500" label="Mod" shape="hexagon" desc="Class"/>
           <LegendIcon color="bg-red-500" label="Heavy" shape="oval" desc="Fn"/>
        </div>
      </div>

      <div className="p-6 border-b border-slate-800 bg-slate-900/50">
        {!node ? (
          <div className="text-center py-12 opacity-20">
            <Network className="mx-auto mb-4" size={32} />
            <p className="text-[9px] font-black uppercase tracking-[0.3em]">Await node selection</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${node.complexity === 'high' ? 'bg-red-500' : node.complexity === 'medium' ? 'bg-orange-500' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(16,185,129,0.3)]`}></div>
              <h2 className="text-lg font-black uppercase tracking-tighter truncate">{node.name}</h2>
            </div>
            <p className="text-[9px] font-mono text-slate-500 truncate">{node.path}</p>
          </div>
        )}
      </div>

      {node && (
        <>
          <div className="flex border-b border-slate-800 bg-slate-950/10">
            <TabButton active={activeTab === 'basic'} onClick={() => setActiveTab('basic')} icon={<Info size={13}/>} label="Node" />
            <TabButton active={activeTab === 'git'} onClick={() => setActiveTab('git')} icon={<GitBranch size={13}/>} label="History" />
            <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Zap size={13}/>} label="Audit" />
            <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={13}/>} label="Query" />
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {activeTab === 'basic' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                 <InfoSection label="Directory Path" value={node.path} icon={<Terminal size={12}/>} />
                 <InfoSection label="Computed Complexity" value={node.complexity.toUpperCase()} valueColor={node.complexity === 'high' ? 'text-red-500' : 'text-emerald-500'} icon={<Activity size={12}/>} />
                 <InfoSection label="Data Volume" value={node.size ? `${(node.size/1024).toFixed(2)} KB` : 'Recursive tree'} icon={<Activity size={12}/>} />
              </div>
            )}

            {activeTab === 'git' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <h3 className="text-[10px] font-black uppercase text-slate-600 mb-2">Primary Contributors</h3>
                {loading ? <LoadingPulse /> : gitAuthors.length > 0 ? gitAuthors.map(a => (
                  <div key={a.name} className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-emerald-500 font-bold border border-slate-700">
                        {a.name[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-[11px] text-slate-300">{a.name}</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-600">{a.commits} COMMITS</span>
                  </div>
                )) : <p className="text-[10px] text-slate-700 uppercase font-black text-center py-4">No git data found</p>}
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="animate-in fade-in duration-300">
                {loading ? <LoadingPulse /> : (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3">
                      <Sparkles size={10} /> Lens Diagnostic
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed italic">"{aiInsight}"</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="h-full flex flex-col animate-in fade-in duration-300 min-h-[300px]">
                <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] p-3 rounded-xl text-[10px] leading-relaxed ${msg.role === 'user' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatHistory.length === 0 && <p className="text-[10px] text-slate-600 text-center py-8">Ask about architecture or patterns.</p>}
                </div>
                <form onSubmit={handleChat} className="flex gap-2 bg-slate-900 pt-2 border-t border-slate-800">
                  <input 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask Gemini..." 
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[10px] focus:outline-none focus:border-emerald-500"
                  />
                  <button type="submit" className="bg-emerald-500 p-2 rounded-lg text-slate-950 hover:bg-emerald-600">
                    <Send size={12} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const LegendIcon = ({ color, label, shape, desc }: { color: string, label: string, shape: string, desc: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className={`w-3.5 h-3.5 ${color} ${shape === 'oval' ? 'rounded-full' : shape === 'rect' ? 'rounded-sm' : '[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]'} opacity-25 border border-white/10`}></div>
    <span className="text-[7px] font-black uppercase text-slate-600 tracking-tighter">{label}</span>
    <span className="text-[6px] font-bold uppercase text-slate-700">{desc}</span>
  </div>
);

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button onClick={onClick} className={`flex-1 py-3.5 flex flex-col items-center gap-1 transition-all border-b-2 ${active ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 'border-transparent text-slate-600 hover:text-slate-400'}`}>
    {icon}
    <span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const InfoSection = ({ label, value, icon, valueColor = "text-slate-400" }: { label: string, value: string, icon: React.ReactNode, valueColor?: string }) => (
  <div className="space-y-1.5">
    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-1.5">
      {icon} {label}
    </div>
    <div className={`p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-lg font-mono text-[10px] break-all leading-tight ${valueColor}`}>
      {value}
    </div>
  </div>
);

const LoadingPulse = () => (
  <div className="animate-pulse space-y-2">
    <div className="h-10 bg-slate-800/30 rounded-lg"></div>
    <div className="h-10 bg-slate-800/30 rounded-lg w-5/6"></div>
  </div>
);

export default NodeInfoPanel;