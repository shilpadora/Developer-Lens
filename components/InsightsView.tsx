
import React from 'react';
import { AnalysisResult } from '../types';
import { ShieldCheck, Cpu, Layers, ExternalLink, Search } from 'lucide-react';

interface Props {
  data: AnalysisResult | null;
  loading: boolean;
}

const InsightsView: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 animate-pulse">Consulting Gemini for Architectural Insights...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
        <div className="p-3 bg-emerald-500/10 rounded-xl">
          <ShieldCheck className="text-emerald-500" size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">AI Code Audit</h2>
          <p className="text-slate-500 text-sm">Deep semantic analysis and performance evaluation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold uppercase text-xs tracking-widest">
            <Cpu size={16} /> Performance & Scalability
          </div>
          <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">{data.performance}</p>
        </section>

        <section className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold uppercase text-xs tracking-widest">
            <Layers size={16} /> Architectural Patterns
          </div>
          <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">{data.architecture}</p>
        </section>

        <section className="col-span-full bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold uppercase text-xs tracking-widest">
             Code Quality Standards
          </div>
          <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">{data.codeQuality}</p>
        </section>
      </div>

      {data.sources.length > 0 && (
        <div className="mt-12 bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center gap-2 mb-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
            <Search size={14} /> Grounding Sources & External Research
          </div>
          <div className="flex flex-wrap gap-3">
            {data.sources.map((source, i) => (
              <a 
                key={i} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-full text-xs text-slate-300 transition-all"
              >
                {source.title} <ExternalLink size={12} className="opacity-50" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsView;
