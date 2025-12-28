import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { FileNode } from '../types';

interface Props {
  data: FileNode[];
}

const MindMap: React.FC<Props> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const render = () => {
      if (!svgRef.current) return;
      const container = svgRef.current.parentElement;
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      // Prevent D3 errors on zero dimensions
      if (width <= 0 || height <= 0) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const g = svg.append("g");

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 5])
        .on("zoom", (event) => g.attr("transform", event.transform));

      svg.call(zoom);

      // Create hierarchy
      const rootData: FileNode = { 
        name: "Project Root", 
        children: data, 
        complexity: 'low', 
        path: 'root', 
        type: 'tree' 
      };
      
      const root = d3.hierarchy<FileNode>(rootData, d => d.children);
      
      const treeLayout = d3.tree<FileNode>().size([height - 100, width - 200]);
      treeLayout(root);

      // Links
      g.selectAll(".link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("d", d3.linkHorizontal<any, any>()
          .x(d => d.y)
          .y(d => d.x) as any)
        .attr("fill", "none")
        .attr("stroke", "#475569")
        .attr("stroke-width", 1)
        .attr("opacity", 0.4);

      // Nodes
      const nodes = g.selectAll(".node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.y},${d.x})`);

      nodes.append("circle")
        .attr("r", 4)
        .attr("fill", d => {
          const c = d.data.complexity;
          if (c === 'high') return '#ef4444';
          if (c === 'medium') return '#f97316';
          return '#10b981';
        })
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 1);

      nodes.append("text")
        .attr("dy", "0.35em")
        .attr("x", d => d.children ? -10 : 10)
        .attr("text-anchor", d => d.children ? "end" : "start")
        .text(d => d.data.name)
        .attr("fill", "#f1f5f9")
        .style("font-size", "10px")
        .style("font-family", "Inter, sans-serif")
        .style("pointer-events", "none")
        .style("text-shadow", "0 1px 3px rgba(0,0,0,0.8)");

      // Initial positioning: offset slightly from left
      const initialTransform = d3.zoomIdentity.translate(80, 50).scale(0.8);
      svg.call(zoom.transform, initialTransform);
    };

    render();
    
    const resizeObserver = new ResizeObserver(() => render());
    resizeObserver.observe(svgRef.current.parentElement!);
    
    return () => resizeObserver.disconnect();
  }, [data]);

  return (
    <div className="w-full h-full bg-slate-950 overflow-hidden relative border border-slate-800 rounded-xl shadow-2xl">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute top-4 left-4 bg-slate-900/80 border border-slate-700 p-2 px-3 rounded-lg backdrop-blur-sm pointer-events-none">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Project Topology</h4>
        <p className="text-[9px] text-slate-400">Pinch or Scroll to zoom • Drag to explore</p>
      </div>
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 p-3 bg-slate-900/80 rounded-lg border border-slate-700 backdrop-blur-sm text-[9px] text-slate-400 pointer-events-none">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider mb-1 border-b border-slate-800 pb-1">Node Complexity</div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Optimized (&lt; 10KB)</div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Moderate (10-50KB)</div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Heavy (&gt; 50KB)</div>
      </div>
    </div>
  );
};

export default MindMap;