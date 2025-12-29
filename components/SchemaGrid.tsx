
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  ConnectionLineType,
  Panel,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Entity } from '../types';
import { Database, Key, Link2, Hash, Layers, Layout, Grid, GitMerge, Maximize2 } from 'lucide-react';

// Custom Table Node Component
const TableNode = ({ data }: NodeProps<{ entity: Entity, isSelected: boolean }>) => {
  const { entity, isSelected } = data;

  return (
    <div className={`transition-all duration-500 ${isSelected ? 'scale-105 z-50' : 'scale-100 z-10'}`} style={{ width: isSelected ? 320 : 180 }}>
      {/* Handles for connections */}
      <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-emerald-500 !w-2 !h-2" />
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-1.5 !h-1.5" />

      <div className={`bg-slate-900/90 border-2 ${isSelected ? 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]' : 'border-slate-800 shadow-xl'} rounded-xl overflow-hidden backdrop-blur-xl`}>
        {/* Compact Header */}
        <div className={`px-4 py-3 flex items-center gap-3 transition-colors ${isSelected ? 'bg-emerald-500/20' : 'bg-slate-950/60'}`}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
            <Database size={12} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isSelected ? 'text-white' : 'text-slate-400'}`}>
            {entity.name}
          </span>
        </div>

        {isSelected && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            {/* Fields List */}
            <div className="p-5 space-y-2.5 bg-slate-900/40 border-t border-slate-800/50">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2 border-b border-slate-800/50 pb-1">SCHEMA DEFINITION</p>
              {entity.fields.map((f, i) => (
                <div key={i} className="flex justify-between items-center py-0.5 group">
                  <div className="flex items-center gap-2">
                    {f.isPrimaryKey ? <Key size={10} className="text-emerald-500" /> : f.isForeignKey ? <Link2 size={10} className="text-orange-500" /> : <Hash size={10} className="text-slate-700" />}
                    <span className={`text-[11px] font-bold ${f.isPrimaryKey ? 'text-emerald-500' : f.isForeignKey ? 'text-orange-400' : 'text-slate-300 group-hover:text-white'} transition-colors`}>
                      {f.name}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-medium text-slate-600 uppercase tracking-tighter">
                    {f.type}
                  </span>
                </div>
              ))}
            </div>

            {/* Relations Indicator */}
            {entity.relations.length > 0 && (
              <div className="px-5 py-3 bg-slate-950/40 border-t border-slate-800/50 flex items-center gap-2">
                <Layers size={10} className="text-slate-600" />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">
                  {entity.relations.length} active relationships
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = { table: TableNode };

type LayoutDirection = 'CONCENTRIC' | 'GRID';

const SchemaGrid: React.FC<{ entities: Entity[] }> = ({ entities }) => {
  const { fitView } = useReactFlow();

  const getLayoutedElements = (nodes: Node[], edges: Edge[], direction: LayoutDirection = 'GRID') => {
    if (direction === 'GRID') {
      const cols = Math.ceil(Math.sqrt(nodes.length));
      const spacingX = 350;
      const spacingY = 150;
      return nodes.map((node, i) => ({
        ...node,
        position: { x: (i % cols) * spacingX, y: Math.floor(i / cols) * spacingY },
      }));
    }

    if (direction === 'CONCENTRIC') {
      const radius = Math.max(500, nodes.length * 60);
      const centerX = radius;
      const centerY = radius;
      return nodes.map((node, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI;
        return {
          ...node,
          position: {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          },
        };
      });
    }

    return nodes; // Fallback
  };

  const initialEdges: Edge[] = useMemo(() => {
    return entities.flatMap(e =>
      e.relations.map((rel, i) => {
        const isOneToOne = rel.type === 'one-to-one';
        return {
          id: `e-${e.name}-${rel.target}-${i}`,
          source: e.name,
          target: rel.target,
          type: 'smoothstep',
          style: { stroke: '#334155', strokeWidth: 1.5, opacity: 0.3 },
          markerStart: isOneToOne ? 'one' : 'one',
          markerEnd: isOneToOne ? 'one' : 'many',
        };
      })
    );
  }, [entities]);

  const initialNodes: Node[] = useMemo(() => {
    const baseNodes = entities.map((e) => ({
      id: e.name,
      type: 'table',
      position: { x: 0, y: 0 },
      data: { entity: e, isSelected: false },
    }));
    return getLayoutedElements(baseNodes, initialEdges, 'GRID');
  }, [entities, initialEdges]);

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [layout, setLayout] = useState<LayoutDirection>('GRID');

  const onLayoutChange = (dir: LayoutDirection) => {
    setLayout(dir);
    const layoutedNodes = getLayoutedElements(nodes, edges, dir);
    setNodes(layoutedNodes);
    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 50);
  };

  const onNodeClick = useCallback((_: any, node: Node) => {
    const selectedId = node.id;
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: { ...n.data, isSelected: n.id === selectedId },
    })));
    setEdges((eds) => eds.map((e) => {
      const isRelated = e.source === selectedId || e.target === selectedId;
      return {
        ...e,
        animated: isRelated,
        style: {
          stroke: isRelated ? '#10b981' : '#334155',
          strokeWidth: isRelated ? 2.5 : 1.5,
          opacity: isRelated ? 0.8 : 0.05
        },
      };
    }));
  }, [entities]);

  if (!entities.length) return null;

  return (
    <div className="h-full w-full bg-slate-950 relative overflow-hidden">
      <Panel position="top-left" className="!m-8 pointer-events-none">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Database <span className="text-emerald-500">Schema</span></h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-1">Interactive Topology Engine</p>
      </Panel>

      <Panel position="top-right" className="!m-8 flex gap-2">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-1.5 rounded-2xl flex gap-1 shadow-2xl">
          <button
            onClick={() => onLayoutChange('CONCENTRIC')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${layout === 'CONCENTRIC' ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
          >
            <GitMerge size={14} className={layout === 'CONCENTRIC' ? 'rotate-45' : ''} />
            <span className="text-[10px] uppercase font-black tracking-widest">Concentric</span>
          </button>
          <button
            onClick={() => onLayoutChange('GRID')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${layout === 'GRID' ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
          >
            <Grid size={14} />
            <span className="text-[10px] uppercase font-black tracking-widest">Grid</span>
          </button>
        </div>
        <button
          onClick={() => fitView({ padding: 0.2, duration: 800 })}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-3 rounded-2xl text-slate-500 hover:text-emerald-500 hover:border-emerald-500/50 transition-all shadow-2xl"
          title="Reset View"
        >
          <Maximize2 size={18} />
        </button>
      </Panel>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        connectionLineType={ConnectionLineType.SmoothStep}
        onPaneClick={() => {
          setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isSelected: false } })));
          setEdges(eds => eds.map(e => ({ ...e, animated: false, style: { ...e.style, stroke: '#334155', strokeWidth: 1.5, opacity: 0.3 } })));
        }}
        fitView
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls className="!bg-slate-900 !border-slate-800 !fill-white" />
        <svg className="absolute">
          <defs>
            <marker id="one" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <line x1="5" y1="0" x2="5" y2="10" stroke="#10b981" strokeWidth="2" />
            </marker>
            <marker id="many" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 M 0 5 L 10 5" fill="none" stroke="#10b981" strokeWidth="1.5" />
            </marker>
          </defs>
        </svg>
      </ReactFlow>

      <style dangerouslySetInnerHTML={{
        __html: `
        .react-flow__handle { opacity: 0; }
        .react-flow__attribution { display: none; }
        .react-flow__controls-button { background: #0f172a !important; border-bottom: 1px solid #1e293b !important; color: #10b981 !important; }
        .react-flow__controls-button:hover { background: #1e293b !important; }
      `}} />
    </div>
  );
};

export default (props: any) => (
  <ReactFlowProvider>
    <SchemaGrid {...props} />
  </ReactFlowProvider>
);
