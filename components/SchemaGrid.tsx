
import React, { useState, useMemo, useRef } from 'react';
import { Entity } from '../types';
import { Database, Link2, Key, List, Layers, ChevronRight, Hash, Maximize2, Minimize2 } from 'lucide-react';

const SchemaGrid: React.FC<{ entities: Entity[] }> = ({ entities }) => {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const entityPositions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    const cols = Math.ceil(Math.sqrt(entities.length));
    const spacingX = 450;
    const spacingY = 500;

    entities.forEach((e, i) => {
      pos[e.name] = {
        x: (i % cols) * spacingX + 50,
        y: Math.floor(i / cols) * spacingY + 50
      };
    });
    return pos;
  }, [entities]);

  if (!entities.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 text-slate-600">
        <Database size={64} className="opacity-10" />
        <p className="text-sm font-black uppercase tracking-widest text-center">No Database Schemas Found<br/><span className="text-[10px] opacity-50">Lens scanning models.py or schema.prisma...</span></p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden relative bg-slate-950/40 select-none">
      <div className="absolute top-8 left-10 z-20 pointer-events-none">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Project <span className="text-emerald-500">Schema</span></h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-1">Interactive ER Topology Overlay</p>
      </div>

      <div 
        ref={canvasRef}
        className="h-full w-full overflow-auto custom-scrollbar relative p-20 scroll-smooth"
      >
        <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" fillOpacity="0.4" />
            </marker>
          </defs>
          {entities.flatMap(e => 
            e.relations.map((rel, i) => {
              const start = entityPositions[e.name];
              const end = entityPositions[rel.target];
              if (!start || !end) return null;
              
              const path = `M ${start.x + 160} ${start.y + 40} C ${start.x + 320} ${start.y + 40}, ${end.x - 120} ${end.y + 40}, ${end.x} ${end.y + 40}`;
              const isHighlit = selectedEntity === e.name || selectedEntity === rel.target;

              return (
                <g key={`${e.name}-${rel.target}-${i}`}>
                  <path 
                    d={path} 
                    stroke={isHighlit ? "#10b981" : "#1e293b"} 
                    strokeWidth={isHighlit ? "2.5" : "1.5"} 
                    fill="none" 
                    opacity={isHighlit ? 0.9 : 0.2} 
                    markerEnd="url(#arrow)"
                    className="transition-all duration-300"
                  />
                </g>
              );
            })
          )}
        </svg>

        <div className="relative z-10">
          {entities.map((e) => {
            const isSelected = selectedEntity === e.name;
            return (
              <div 
                key={e.name}
                style={{ left: entityPositions[e.name].x, top: entityPositions[e.name].y }}
                onClick={() => setSelectedEntity(isSelected ? null : e.name)}
                className={`absolute w-[340px] transition-all duration-500 cursor-pointer ${isSelected ? 'scale-105 z-50 ring-4 ring-emerald-500/20' : 'scale-100 z-10 hover:translate-y-[-4px]'}`}
              >
                <div className={`bg-slate-900 border ${isSelected ? 'border-emerald-500/50 shadow-[0_0_80px_rgba(16,185,129,0.2)]' : 'border-slate-800 shadow-xl'} rounded-[2rem] overflow-hidden backdrop-blur-3xl`}>
                  <div className={`px-8 py-4 flex justify-between items-center transition-colors ${isSelected ? 'bg-emerald-500/10' : 'bg-slate-950/40 hover:bg-slate-900'}`}>
                    <div className="flex items-center gap-3">
                      <Database size={16} className={isSelected ? 'text-emerald-500' : 'text-slate-700'} />
                      <span className={`text-sm font-black uppercase tracking-widest ${isSelected ? 'text-emerald-500' : 'text-slate-400'}`}>{e.name}</span>
                    </div>
                    {isSelected ? <Minimize2 size={14} className="text-emerald-500" /> : <Maximize2 size={14} className="text-slate-800" />}
                  </div>

                  {isSelected && (
                    <div className="p-8 space-y-4 animate-in fade-in duration-300">
                      <div className="space-y-3">
                        {e.fields.map((f, j) => (
                          <div key={j} className="flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                              {f.isPrimaryKey && <Key size={12} className="text-emerald-500" />}
                              {f.isForeignKey && <Link2 size={12} className="text-orange-500" />}
                              <span className={`text-[12px] font-bold ${f.isPrimaryKey ? 'text-emerald-500' : f.isForeignKey ? 'text-orange-400' : 'text-slate-200'}`}>{f.name}</span>
                            </div>
                            <span className="text-[10px] font-mono italic text-slate-700 uppercase">{f.type}</span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 mt-6">
                        {e.relations.length > 0 && (
                          <div className="mb-6">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-4 flex items-center gap-2">
                              <Layers size={14} /> Relationships
                            </div>
                            <div className="space-y-2">
                              {e.relations.map((rel, k) => (
                                <div key={k} className="flex justify-between items-center p-3 bg-slate-900 border border-slate-800 rounded-xl">
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">→ {rel.target}</span>
                                  <span className="text-[8px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 uppercase">{rel.type}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SchemaGrid;
