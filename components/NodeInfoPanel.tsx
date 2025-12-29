
import React, { useState, useEffect } from 'react';
import { 
  Info, GitBranch, Zap, MessageSquare, 
  Terminal, User, Users, Activity, Sparkles, Send, Network, ExternalLink, Github, Code, PlusSquare, MinusSquare, Box, Layers, Cpu
} from 'lucide-react';
import { FileNode, RepoProject } from '../types';
import { GoogleGenAI } from '@google/genai';
import { GitHubService } from '../services/githubService';
import { ParserService } from '../services/parserService';

interface Props {
  node: FileNode | null;
  project: RepoProject;
  onClose: () => void;
}

type Tab = 'node' | 'git' | 'audit' | 'chat';

const NodeInfoPanel: React.FC<Props> = ({ node, project }) => {
  const [activeTab, setActiveTab] = useState<Tab>('node');
  const [loading, setLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [structure, setStructure] = useState<FileNode[]>([]);
  const [fetchingStructure, setFetchingStructure] = useState(false);

  useEffect(() => {
    if (!node) return;
    setAiInsight('');
    setChatHistory([]);
    setFileContent(null);
    setStructure([]);
    
    if (activeTab === 'audit') fetchAudit();
    if (node.type === 'blob') fetchStructure();
  }, [node, activeTab]);

  const fetchStructure = async () => {
    if (!node || node.type !== 'blob') return;
    setFetchingStructure(true);
    try {
      const content = await GitHubService.getFile(project.owner, project.name, node.path, project.token);
      setFileContent(content);
      const internalNodes = ParserService.parseCodeStructure(content, node.name);
      setStructure(internalNodes);
    } catch (e) {
      console.error("Failed to fetch structure:", e);
    } finally {
      setFetchingStructure(false);
    }
  };

  const fetchAudit = async () => {
    if (!node) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Examine "${node.path}" in repo "${project.name}". It is marked with ${node.complexity} complexity. Describe the technical importance and potential debt in 2-3 deep points.`
      });
      setAiInsight(response.text || 'Audit engine returned empty result.');
    } catch (e) { setAiInsight('Intelligence sync severed.'); } finally { setLoading(false); }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !node) return;
    const msg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);

    try {
      let context = `Context: Repository ${project.name}, Path: ${node.path}. `;
      if (node.type === 'blob') {
        const content = fileContent || await GitHubService.getFile(project.owner, project.name, node.path, project.token);
        if (content) {
          setFileContent(content);
          context += `File Content:\n\n${content}\n\n`;
        }
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chat = ai.chats.create({ 
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: "You are a senior codebase architect. Use provided file content to answer deeply about logic and patterns." }
      });
      const response = await chat.sendMessage({ message: `${context}Query: ${msg}` });
      setChatHistory(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', text: 'Chat link corrupted.' }]);
    }
  };

  const nodeContributors = project.stats?.periods?.total?.contributors?.slice(0, 5) || [];
  const githubUrl = `https://github.com/${project.owner}/${project.name}/blob/main/${node?.path}`;

  return (
    <div className={`flex flex-col h-full animate-in fade-in duration-300 overflow-hidden bg-slate-900/10`}>
      <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex flex-col gap-6">
        {!node ? (
          <div className="text-center py-20 opacity-20 w-full flex flex-col items-center">
            <Network className="mb-6" size={48} />
            <p className="text-[12px] font-black uppercase tracking-[0.5em]">Target Required</p>
            <p className="text-[10px] text-slate-600 font-bold uppercase mt-2">Select a node in the map to view metadata</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className={`w-3.5 h-3.5 rounded-full ${node.complexity === 'high' ? 'bg-red-500' : node.complexity === 'medium' ? 'bg-orange-500' : 'bg-emerald-500'} shadow-[0_0_15px_rgba(16,185,129,0.3)]`}></div>
                 <h2 className="text-2xl font-black uppercase tracking-tighter truncate max-w-[200px]">{node.name}</h2>
               </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-mono text-slate-500 truncate bg-slate-950/40 p-3 rounded-xl border border-slate-800/50 flex-1">{node.path}</p>
              <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-800 hover:bg-emerald-500/20 text-emerald-500 rounded-xl border border-slate-700 transition-all flex items-center gap-2 group">
                <Github size={14}/><ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </div>

      {node && (
        <>
          <div className="flex border-b border-slate-800 bg-slate-950/20">
            <TabBtn active={activeTab === 'node'} onClick={() => setActiveTab('node')} icon={<Info size={16}/>} label="Properties" />
            <TabBtn active={activeTab === 'git'} onClick={() => setActiveTab('git')} icon={<GitBranch size={16}/>} label="Analytics" />
            <TabBtn active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<Zap size={16}/>} label="AI Insights" />
            <TabBtn active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={16}/>} label="Chat" />
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'node' && (
              <div className="space-y-10 animate-in slide-in-from-bottom-5 duration-300">
                 <InfoSec label="Repository Path" value={node.path} icon={<Terminal size={16}/>} />
                 
                 {node.type === 'blob' && (
                   <div className="space-y-4">
                     <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 flex items-center gap-3">
                       <Box size={16}/> Internal Structure
                     </div>
                     <div className="bg-slate-950/40 border border-slate-800/60 rounded-[2rem] p-6 space-y-4">
                        {fetchingStructure ? (
                          <div className="flex items-center gap-3 animate-pulse">
                            <div className="w-4 h-4 rounded-full bg-emerald-500/20"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Analyzing internal logic...</span>
                          </div>
                        ) : structure.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2">
                             {structure.map((item, idx) => (
                               <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl group hover:border-emerald-500/30 transition-all">
                                 <div className="flex items-center gap-3">
                                   {item.type === 'tree' ? <Layers size={14} className="text-blue-500" /> : <Cpu size={14} className="text-emerald-500" />}
                                   <span className="text-[11px] font-black text-slate-300 uppercase truncate">{item.name}</span>
                                 </div>
                                 <span className="text-[8px] font-black uppercase tracking-widest text-slate-700 group-hover:text-emerald-500">{item.type === 'tree' ? 'Class' : 'Function'}</span>
                               </div>
                             ))}
                          </div>
                        ) : (
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 text-center py-4">No high-level structures detected</p>
                        )}
                     </div>
                   </div>
                 )}

                 <InfoSec label="Structural Complexity" value={node.complexity.toUpperCase()} valueColor={node.complexity === 'high' ? 'text-red-500' : 'text-emerald-500'} icon={<Activity size={16}/>} />
                 {node.size && <InfoSec label="Byte Payload" value={`${(node.size/1024).toFixed(2)} KB`} icon={<Code size={16}/>} />}
              </div>
            )}

            {activeTab === 'git' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-2">
                   <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em]">Top contributors</h3>
                   <GitBranch size={16} className="text-slate-700" />
                </div>
                {nodeContributors.length > 0 ? nodeContributors.map((c, i) => (
                  <div key={i} className="p-5 bg-slate-950/40 rounded-[2rem] border border-slate-800 space-y-5 group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all">
                           <User size={18} className="text-emerald-500" />
                        </div>
                        <div>
                          <span className="font-black text-xs text-slate-200 uppercase tracking-tighter">@{c.author}</span>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mt-0.5">{c.commits} Contributions</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-6 pt-1 border-t border-slate-800/50 mt-2">
                       <div className="flex items-center gap-2">
                          <PlusSquare size={14} className="text-emerald-500" />
                          <span className="text-[11px] font-black text-emerald-500">+{c.additions.toLocaleString()}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <MinusSquare size={14} className="text-red-500" />
                          <span className="text-[11px] font-black text-red-500">-{c.deletions.toLocaleString()}</span>
                       </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center opacity-10">
                     <Users size={48} className="mx-auto mb-4" />
                     <p className="text-[12px] font-black uppercase tracking-widest">Git data pending sync</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="animate-in fade-in duration-300">
                {loading ? <LoadingBar /> : (
                  <div className="p-8 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-[2.5rem]">
                    <div className="flex items-center gap-3 text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-6">
                      <Sparkles size={16} /> Gemini Deep Scoped Analysis
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed font-medium whitespace-pre-wrap">{aiInsight}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="h-full flex flex-col animate-in fade-in duration-300 min-h-[400px]">
                <div className="flex-1 space-y-6 mb-8 overflow-y-auto pr-3 custom-scrollbar">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] p-5 rounded-3xl text-sm leading-relaxed shadow-xl ${msg.role === 'user' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-700 opacity-50 space-y-4">
                       <MessageSquare size={32} />
                       <p className="text-[10px] font-black uppercase tracking-[0.4em] text-center">Intelligence Terminal Active<br/>Context Injected</p>
                    </div>
                  )}
                </div>
                <form onSubmit={handleChat} className="flex gap-4 bg-slate-900 pt-6 border-t border-slate-800 sticky bottom-0">
                  <input 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask about architecture..." 
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium placeholder:text-slate-800 shadow-inner"
                  />
                  <button type="submit" className="bg-emerald-500 px-6 rounded-2xl text-slate-950 hover:bg-emerald-600 transition-all active:scale-90 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <Send size={18} />
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

const TabBtn = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button onClick={onClick} className={`flex-1 py-6 flex flex-col items-center gap-2 transition-all border-b-4 ${active ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 'border-transparent text-slate-600 hover:text-slate-300'}`}>
    {icon}
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const InfoSec = ({ label, value, icon, valueColor = "text-slate-400" }: { label: string, value: string, icon: React.ReactNode, valueColor?: string }) => (
  <div className="space-y-4">
    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 flex items-center gap-3">
      {icon} {label}
    </div>
    <div className={`p-6 bg-slate-950/40 border border-slate-800/60 rounded-[2rem] font-mono text-xs break-all leading-relaxed ${valueColor} shadow-inner`}>
      {value}
    </div>
  </div>
);

const LoadingBar = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-14 bg-slate-800/40 rounded-[2rem]"></div>
    <div className="h-14 bg-slate-800/40 rounded-[2rem] w-4/5"></div>
    <div className="h-14 bg-slate-800/40 rounded-[2rem] w-2/3"></div>
  </div>
);

export default NodeInfoPanel;
