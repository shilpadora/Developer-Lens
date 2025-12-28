import React from 'react';
import { Entity } from '../types';
import { Database, Link2 } from 'lucide-react';

const SchemaGrid: React.FC<{ entities: Entity[] }> = ({ entities }) => {
  if (!entities.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 text-slate-600">
        <Database size={64} className="opacity-10" />
        <p className="text-sm font-black uppercase tracking-widest">No models detected in Models.py or Prisma</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
      {entities.map((e, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl h-fit">
          <div className="bg-emerald-500/10 px-8 py-4 border-b border-slate-800 flex justify-between items-center">
             <h4 className="text-sm font-black text-emerald-500 uppercase tracking-[0.2em]">{e.name}</h4>
             <Database size={14} className="text-emerald-500/50" />
          </div>
          <div className="p-8 space-y-3">
             {e.fields.map((f, j) => (
               <div key={j} className="flex justify-between items-center text-xs">
                 <span className="text-slate-200 font-bold">{f.name}</span>
                 <span className="text-slate-600 font-mono italic">{f.type}</span>
               </div>
             ))}
          </div>
          {e.relations.length > 0 && (
            <div className="bg-slate-950/50 p-6 border-t border-slate-800">
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                 <Link2 size={12} /> Relations
               </div>
               <div className="space-y-2">
                 {e.relations.map((rel, k) => (
                   <div key={k} className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-bold">→ {rel.target}</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-500 uppercase">{rel.type}</span>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SchemaGrid;