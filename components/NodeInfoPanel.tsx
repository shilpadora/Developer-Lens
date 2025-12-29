
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
  globalToken?: string;
  onClose: () => void;
}

type Tab = 'node' | 'contributors' | 'audit' | 'chat';

const NodeInfoPanel: React.FC<Props> = ({ node, project, globalToken, onClose }) => {
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
    if (node.kind === 'file' || node.type === 'blob') fetchStructure();
  }, [node, activeTab]);

  const fetchStructure = async () => {
    if (!node || (node.kind !== 'file' && node.type !== 'blob')) return;
    setFetchingStructure(true);
    try {
      const tokenToUse = project.token || globalToken;
      const content = await GitHubService.getFile(project.owner, project.name, node.path, tokenToUse);
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
      const tokenToUse = project.token || globalToken;
      const ai = new GoogleGenAI({ apiKey: tokenToUse || process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze file: "${node.path}" in repo: "${project.name}". Complexity: ${node.complexity}. Provide 2 precise technical insights about its architectural role and potential technical debt.`
      });
      setAiInsight(response.text || 'Architectural insights unavailable.');
    } catch (e) {
      console.error("AI Analysis Failed:", e);
      setAiInsight('Intelligence link disrupted.');
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !node) return;
    const msg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);

    try {
      let context = `Context: Repository ${project.name}, Path: ${node.path}. `;
      if (node.kind === 'file' || node.type === 'blob') {
        const tokenToUse = project.token || globalToken;
        const content = fileContent || await GitHubService.getFile(project.owner, project.name, node.path, tokenToUse);
        if (content) {
          setFileContent(content);
          context += `Code snippet for context:\n\n${content.slice(0, 5000)}\n\n`;
        }
      }
      const tokenToUse = project.token || globalToken;
      const ai = new GoogleGenAI({ apiKey: tokenToUse || process.env.API_KEY || '' });
      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: "You are a lead architect. Use provided code context to explain logic, patterns, and optimization strategies." }
      });
      const response = await chat.sendMessage({ message: `${context}\nUser Question: ${msg}` });
      setChatHistory(prev => [...prev, { role: 'model', text: response.text || 'Intelligence engine returned no output.' }]);
    } catch (e) {
      console.error("Chat Error:", e);
      setChatHistory(prev => [...prev, { role: 'model', text: 'Cognitive uplink failed.' }]);
    }
  };

  const topContributors = project.stats?.periods?.total?.contributors?.slice(0, 5) || [];
  const githubUrl = `https://github.com/${project.owner}/${project.name}/blob/main/${node?.path}`;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 overflow-hidden bg-slate-900/5">
      {node ? (
        <>
          <div className="flex border-b border-slate-800 bg-slate-950/40 sticky top-0 z-10">
            <TabBtn active={activeTab === 'node'} onClick={() => setActiveTab('node')} icon={<Info size={16} />} label="Properties" />
            <TabBtn active={activeTab === 'contributors'} onClick={() => setActiveTab('contributors')} icon={<Users size={16} />} label="Contributors" />
            <TabBtn active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<Zap size={16} />} label="Intelligence" />
            <TabBtn active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={16} />} label="Chat" />
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'node' && (
              <div className="space-y-10 animate-in slide-in-from-bottom-5 duration-300">
                <div className="space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal size={16} /> Repository Path
                    </div>
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                    >
                      <span className="text-[8px] font-black">Open in GitHub</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl font-mono text-xs break-all leading-relaxed text-slate-300 shadow-inner">
                    {node.path}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InfoSec
                    label="Complexity"
                    value={node.complexity.toUpperCase()}
                    icon={<Activity size={16} />}
                    valueColor={node.complexity === 'high' ? 'text-red-500' : node.complexity === 'medium' ? 'text-orange-500' : 'text-emerald-500'}
                  />
                  {node.size !== undefined ? (
                    <InfoSec label="Disk Size" value={`${(node.size / 1024).toFixed(2)} KB`} icon={<Code size={16} />} />
                  ) : (
                    <InfoSec label="Type" value={node.kind?.toUpperCase() || (node.type === 'tree' ? 'FOLDER' : 'FILE')} icon={<Layers size={16} />} />
                  )}
                </div>

                {(node.kind === 'file' || node.type === 'blob') && (
                  <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 flex items-center gap-3">
                      <Box size={16} /> Structural Anatomy
                    </div>
                    <div className="bg-slate-950/40 border border-slate-800/60 rounded-[2rem] p-6 space-y-4 shadow-inner">
                      {fetchingStructure ? (
                        <div className="flex items-center gap-3 animate-pulse py-4">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20"></div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Deconstructing symbols...</span>
                        </div>
                      ) : structure.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {structure.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl group hover:border-emerald-500/30 transition-all">
                              <div className="flex items-center gap-3 overflow-hidden">
                                {item.kind === 'class' ? <Layers size={14} className="text-blue-500" /> : <Cpu size={14} className="text-emerald-500" />}
                                <span className="text-[11px] font-black text-slate-300 uppercase truncate">{item.name}</span>
                              </div>
                              <span className="flex-shrink-0 text-[8px] font-black uppercase tracking-widest text-slate-700 group-hover:text-emerald-500">{item.kind?.toUpperCase() || 'NODE'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 text-center py-6">No specific code symbols mapped</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contributors' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em]">Top contributors</h3>
                </div>
                {topContributors.length > 0 ? topContributors.map((c, i) => (
                  <div key={i} className="p-6 bg-slate-900/40 rounded-[2.5rem] border border-slate-800 space-y-6 group hover:border-emerald-500/30 transition-all shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                          <User size={20} className="text-emerald-500 group-hover:text-slate-950" />
                        </div>
                        <div>
                          <span className="font-black text-sm text-slate-100 uppercase tracking-tighter truncate max-w-[150px]">@{c.author}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <GitBranch size={10} className="text-slate-600" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{c.commits} Total commits</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-slate-800/50 group-hover:text-emerald-500/20 transition-colors italic">#{i + 1}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
                      <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
                        <PlusSquare size={14} className="text-emerald-500" />
                        <span className="text-[11px] font-black text-emerald-500">+{c.additions.toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
                        <MinusSquare size={14} className="text-red-500" />
                        <span className="text-[11px] font-black text-red-500">-{c.deletions.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center opacity-20 select-none">
                    <Users size={64} className="mx-auto mb-6 text-slate-700" />
                    <p className="text-[12px] font-black uppercase tracking-widest text-slate-500">Historical velocity unknown</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="animate-in fade-in duration-300">
                {loading ? <LoadingBar /> : (
                  <div className="p-8 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-3xl shadow-2xl">
                    <div className="flex items-center gap-3 text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-8">
                      <Sparkles size={16} /> Architectural Review
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed font-medium whitespace-pre-wrap">{aiInsight || 'Trigger analysis by selecting a source node.'}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="h-full flex flex-col animate-in fade-in duration-300 min-h-[450px]">
                <div className="flex-1 space-y-6 mb-6 overflow-y-auto pr-3 custom-scrollbar">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] p-4 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 text-center space-y-4 select-none">
                      <MessageSquare size={48} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Architecture Consultant Online<br />Query logic, patterns, or debt</p>
                    </div>
                  )}
                </div>
                <form onSubmit={handleChat} className="flex gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 sticky bottom-0">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Consult lead architect..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-500 transition-all font-medium"
                  />
                  <button type="submit" className="bg-emerald-500 p-3 rounded-xl text-slate-950 hover:bg-emerald-600 transition-all active:scale-90 shadow-lg">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center p-12 opacity-20 select-none text-center">
          <Network className="mb-6 text-emerald-500" size={48} />
          <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-300">Target Required</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">Select a node in the map to activate intelligence sidecar</p>
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button onClick={onClick} className={`flex-1 py-5 flex flex-col items-center gap-1 transition-all border-b-2 ${active ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 'border-transparent text-slate-600 hover:text-slate-400'}`}>
    {icon}
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const InfoSec = ({ label, value, icon, valueColor = "text-slate-300" }: { label: string, value: string, icon: React.ReactNode, valueColor?: string }) => (
  <div className="space-y-3">
    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 flex items-center gap-2">
      {icon} {label}
    </div>
    <div className={`p-4 bg-slate-950/60 border border-slate-800 rounded-2xl font-mono text-xs break-all leading-relaxed ${valueColor} shadow-inner`}>
      {value}
    </div>
  </div>
);

const LoadingBar = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-10 bg-slate-800 rounded-2xl"></div>
    <div className="h-10 bg-slate-800 rounded-2xl w-4/5"></div>
    <div className="h-10 bg-slate-800 rounded-2xl w-2/3"></div>
  </div>
);

export default NodeInfoPanel;
