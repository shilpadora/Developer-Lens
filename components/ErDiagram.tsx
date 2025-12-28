
import React from 'react';
import { Entity } from '../types';
import { Database, Link as LinkIcon } from 'lucide-react';

interface Props {
  entities: Entity[];
}

const ErDiagram: React.FC<Props> = ({ entities }) => {
  if (!entities.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Database size={48} className="mb-4 opacity-20" />
        <p>No schemas detected in common model files (models.py, schema.prisma, etc.)</p>
      </div>
    );
  }

  return (
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 h-full overflow-y-auto">
      {entities.map((entity, i) => (
        <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl flex flex-col overflow-hidden h-fit">
          <div className="bg-emerald-600/20 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
            <span className="font-black text-emerald-400 uppercase tracking-wider text-xs">{entity.name}</span>
            <Database size={14} className="text-emerald-500 opacity-50" />
          </div>
          <div className="p-3 space-y-2">
            {entity.fields.map((f, j) => (
              <div key={j} className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">{f.name}</span>
                <span className="text-slate-500 font-mono italic">{f.type}</span>
              </div>
            ))}
          </div>
          {entity.relations.length > 0 && (
            <div className="bg-slate-900/50 p-3 border-t border-slate-700/50">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                <LinkIcon size={10} /> Relations
              </div>
              {entity.relations.map((rel, k) => (
                <div key={k} className="text-[10px] flex items-center justify-between text-slate-400">
                  <span>→ {rel.target}</span>
                  <span className="bg-slate-700 px-1 rounded text-[8px]">{rel.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ErDiagram;
