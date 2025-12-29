
import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AnalysisResult, GitStats, RepoProject } from '../types';
import { 
  Layout, Server, Cpu, Sparkles, Box, 
  Database as DbIcon, ChevronRight, X, MessageSquare, 
  ExternalLink, Terminal, Send
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface Props {
  aiData: AnalysisResult | null;
  stats: GitStats | null;
  aiLoading: boolean;
  project: RepoProject | undefined;
  onTriggerAnalysis: () => void;
}

type LayerKey = 'frontend' | 'backend' | 'devops' | 'databases';

const StackView: React.FC<Props> = ({ aiData, stats, aiLoading, project, onTriggerAnalysis }) => {
  const [selectedLayer, setSelectedLayer] = useState<LayerKey | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];
  
  const extensions = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.extensions)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value).slice(0, 6);
  }, [stats]);

  // Basic heuristic detection for tech stack
  const heuristics = useMemo(() => {
    const ext = stats?.extensions || {};
    const layers: Record<LayerKey, string[]> = {
      frontend: [],
      backend: [],
      databases: [],
      devops: []
    };

    if (ext.tsx || ext.jsx || ext.html || ext.css) layers.frontend.push('React/Web');
    if (ext.py) layers.backend.push('Python/Django/Flask');
    if (ext.js || ext.ts) layers.backend.push('Node.js/Express');
    if (ext.sql || ext.prisma) layers.databases.push('SQL/Prisma');
    if (ext.dockerfile || ext.yml || ext.yaml) layers.devops.push('Docker/K8s/CI');

    return layers;
  }, [stats]);

  const handleCardClick = (layer: LayerKey) => {
    if (!aiData && !aiLoading) {
      onTriggerAnalysis();
    }
    setSelectedLayer(layer);
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedLayer) return;
    const msg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = `User is asking about the ${selectedLayer} stack of the project ${project?.name}.
      Detected ${selectedLayer} tools: ${aiData?.stack[selectedLayer].join(', ') || heuristics[selectedLayer].join(', ')}.
      Known libraries: ${aiData?.libraries[selectedLayer].join(', ') || 'Gathering...'}.`;

      const chat = ai.chats.create({ 
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: "You are an expert system architect specializing in the requested stack layer. Provide actionable, concise, and deep technical advice." }
      });
      const response = await chat.sendMessage({ message: `${context}\n\nUser Question: ${msg}` });
      setChatHistory(prev => [...prev, { role: 'model', text: response.text || 'No response.' }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', text: 'Intelligence link severed.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="h-full flex relative overflow-hidden">
      <div className={`flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar transition-all duration-500 ${selectedLayer ? 'opacity-40 pointer-events-none scale-95 blur-sm' : ''}`}>
        <div className="flex items-center gap-6 mb-12 border-b border-slate-800 pb-10">
          <div className="p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <Layout className="text-emerald-500" size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter">Technology <span className="text-emerald-500">Stack</span></h2>
            <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.3em]">Project DNA Analysis & Structural Identity</p>
          </div>
        </div>

        {/* Architecture Footprint Section - Shown First */}
        <div className="bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800 shadow-2xl">
           <div className="flex items-center gap-4 mb-10">
             <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
               <Cpu className="text-emerald-500" size={24} />
             </div>
             <div>
               <h3 className="text-xl font-black uppercase tracking-tighter text-slate-200">Architecture Footprint</h3>
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mt-1">Source file distribution by extension</p>
             </div>
           </div>
           
           <div className="flex flex-col lg:flex-row items-center gap-16">
             <div className="w-full lg:w-1/2 h-80">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={extensions} innerRadius={80} outerRadius={120} paddingAngle={10} dataKey="value" stroke="none">
                     {extensions.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                   </Pie>
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }}
                     itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                   />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             
             <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-6">
               {extensions.map((e, i) => (
                 <div key={e.name} className="flex items-center gap-5 p-5 rounded-3xl bg-slate-950/40 border border-slate-800 hover:border-emerald-500/30 transition-all group">
                   <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shadow-inner" style={{ backgroundColor: `${COLORS[i % COLORS.length]}20`, color: COLORS[i % COLORS.length] }}>
                      {e.name.toUpperCase()}
                   </div>
                   <div className="flex-1">
                     <div className="flex justify-between items-center">
                       <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">.{e.name}</span>
                       <span className="text-[10px] text-emerald-500 font-black">{e.value} Files</span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (e.value / (extensions[0]?.value || 1)) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        </div>

        {/* Stack Layer Cards - Shown Second */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StackCard 
            icon={<Layout className="text-blue-500" />} 
            title="Frontend" 
            items={aiData?.stack.frontend || heuristics.frontend} 
            color="border-blue-500/20"
            onClick={() => handleCardClick('frontend')}
          />
          <StackCard 
            icon={<Server className="text-emerald-500" />} 
            title="Backend" 
            items={aiData?.stack.backend || heuristics.backend} 
            color="border-emerald-500/20"
            onClick={() => handleCardClick('backend')}
          />
          <StackCard 
            icon={<DbIcon className="text-purple-500" />} 
            title="Databases" 
            items={aiData?.stack.databases || heuristics.databases} 
            color="border-purple-500/20"
            onClick={() => handleCardClick('databases')}
          />
          <StackCard 
            icon={<Box className="text-orange-500" />} 
            title="DevOps" 
            items={aiData?.stack.devops || heuristics.devops} 
            color="border-orange-500/20"
            onClick={() => handleCardClick('devops')}
          />
        </div>
      </div>

      {/* Layer Detail Slide-over */}
      {selectedLayer && (
        <div className="absolute inset-y-0 right-0 w-full lg:w-1/2 bg-slate-950/95 backdrop-blur-3xl border-l border-slate-800 z-[60] shadow-[-50px_0_100px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-right duration-500">
           <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <Sparkles className="text-emerald-500" size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{selectedLayer} <span className="text-emerald-500">Intelligence</span></h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scoped Architectural Deep-Dive</p>
                </div>
             </div>
             <button onClick={() => { setSelectedLayer(null); setChatHistory([]); }} className="p-3 rounded-2xl hover:bg-slate-800 text-slate-500 hover:text-white transition-all">
                <X size={24} />
             </button>
           </div>

           <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
              {aiLoading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Deep scanning repositories...</p>
                </div>
              ) : (
                <>
                  <section>
                    <div className="flex items-center gap-3 mb-6 text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                      <Box size={14} /> Core Libraries & Dependencies
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {aiData?.libraries[selectedLayer].map((lib, i) => (
                        <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                           <span className="text-sm font-bold text-slate-200">{lib}</span>
                           <ExternalLink size={14} className="text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )) || <p className="text-slate-600 text-xs italic">No additional libraries detected.</p>}
                    </div>
                  </section>

                  <section className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 p-8 flex flex-col h-[500px]">
                     <div className="flex items-center gap-3 mb-8 text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                       <MessageSquare size={14} /> Architect Consultation
                     </div>
                     
                     <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
                       {chatHistory.map((chat, i) => (
                         <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${chat.role === 'user' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 border border-slate-700 text-slate-200'}`}>
                               {chat.text}
                            </div>
                         </div>
                       ))}
                       {chatLoading && (
                         <div className="flex justify-start">
                            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex items-center gap-2">
                               <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></div>
                               <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                               <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                         </div>
                       )}
                       {chatHistory.length === 0 && (
                         <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                            <Terminal size={48} />
                            <p className="text-xs font-black uppercase tracking-widest">Consult Gemini about this layer<br/>(e.g. "Optimize this backend")</p>
                         </div>
                       )}
                     </div>

                     <form onSubmit={handleChat} className="flex gap-4 border-t border-slate-800 pt-6">
                        <input 
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder={`Ask about the ${selectedLayer} architecture...`}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium"
                        />
                        <button type="submit" className="bg-emerald-500 p-3 rounded-xl text-slate-950 hover:bg-emerald-600 transition-all active:scale-95 shadow-lg">
                           <Send size={20} />
                        </button>
                     </form>
                  </section>
                </>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

const StackCard = ({ icon, title, items, color, onClick }: { icon: React.ReactNode, title: string, items: string[], color: string, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className={`bg-slate-900 border ${color} p-6 rounded-[2rem] shadow-xl flex flex-col hover:scale-105 hover:bg-slate-800/80 transition-all cursor-pointer group relative overflow-hidden h-[180px]`}
  >
    <div className="flex items-center gap-3 mb-6">
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-200">{title}</h3>
    </div>
    <div className="flex flex-wrap gap-2 mb-4">
      {(items || []).slice(0, 4).map((item, idx) => (
        <div key={idx} className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-400">
          {item}
        </div>
      ))}
      {(!items || items.length === 0) && (
        <div className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Detecting...</div>
      )}
    </div>
    <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-600 group-hover:text-emerald-500">
      <span>Deep Analysis</span>
      <ChevronRight size={12} />
    </div>
  </div>
);

export default StackView;
