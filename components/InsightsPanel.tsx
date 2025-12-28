import React from 'react';
import { AnalysisResult } from '../types.ts';
import { ShieldCheck, Cpu, Layers, ExternalLink, Search, Sparkles } from 'lucide-react';

const InsightsPanel: React.FC<{ data: AnalysisResult | null, loading: boolean }> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
          <Sparkles className="absolute inset-0 m-auto text-emerald-500 animate-pulse" size={32} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Lens deep-scanning architecture...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full overflow-y-auto p-12 space-y-12 max-w-6xl mx-auto custom-scrollbar">
      <div className="flex items-center gap-6 mb-12 border-b border-slate-800 pb-10">
        <div className="p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
          <ShieldCheck className="text-emerald-500" size={40} />
        </div>
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter">Architectural Audit</h2>
          <p className="text-slate-500 font-medium">Gemini-Powered Intelligence & Stack Validation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <InsightCard 
          icon={<Cpu className="text-emerald-500" />} 
          title="Performance Vector" 
          content={data.performance} 
        />
        <InsightCard 
          icon={<Layers className="text-emerald-500" />} 
          title="Structural Patterns" 
          content={data.architecture} 
        />
        <InsightCard 
          icon={<ShieldCheck className="text-emerald-500" />} 
          title="Code Quality Index" 
          content={data.codeQuality} 
          className="col-span-full"
        />
      </div>

      <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-slate-800">
         <div className="flex items-center gap-3 mb-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
           <Search size={14} /> Intelligence Sources & Research
         </div>
         <div className="flex flex-wrap gap-4">
           {data.sources.map((s, i) => (
             <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 px-6 py-3 rounded-2xl text-xs font-bold text-slate-300 transition-all group">
               {s.title} <ExternalLink size={12} className="text-slate-600 group-hover:text-emerald-500" />
             </a>
           ))}
         </div>
      </div>
    </div>
  );
};

const InsightCard = ({ icon, title, content, className = "" }: { icon: React.ReactNode, title: string, content: string, className?: string }) => (
  <div className={`bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl hover:border-emerald-500/30 transition-all ${className}`}>
    <div className="flex items-center gap-3 mb-6 text-emerald-500 font-black uppercase tracking-widest text-xs">
      {icon} {title}
    </div>
    <p className="text-slate-400 text-sm leading-relaxed font-medium whitespace-pre-wrap">{content}</p>
  </div>
);

export default InsightsPanel;