import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { FileNode } from '../types.ts';

const TopologyMap: React.FC<{ data: FileNode[] }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;
    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    const rootData: FileNode = { name: "Root", path: "root", type: "tree", complexity: "low", children: data };
    const root = d3.hierarchy<FileNode>(rootData);
    const tree = d3.tree<FileNode>().size([height - 100, width - 200]);
    tree(root);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter().append("path")
      .attr("d", d3.linkHorizontal<any, any>().x(d => d.y).y(d => d.x) as any)
      .attr("fill", "none")
      .attr("stroke", "#334155")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.5);

    // Nodes
    const nodes = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    nodes.append("circle")
      .attr("r", 5)
      .attr("fill", d => {
        if (d.data.complexity === 'high') return '#ef4444';
        if (d.data.complexity === 'medium') return '#f59e0b';
        return '#10b981';
      })
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 1.5);

    nodes.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d.children ? -10 : 10)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.name)
      .attr("fill", "#f8fafc")
      .style("font-size", "10px")
      .style("font-weight", "500")
      .style("text-shadow", "0 2px 4px rgba(0,0,0,0.5)");

    svg.call(zoom.transform, d3.zoomIdentity.translate(80, 50).scale(0.7));

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      svg.attr("width", w).attr("height", h);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [data]);

  return (
    <div className="w-full h-full bg-slate-950 overflow-hidden relative cursor-grab active:cursor-grabbing">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute top-8 left-10 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 backdrop-blur-md pointer-events-none">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-2">Cluster Map</h4>
        <div className="flex flex-col gap-2">
           <LegendItem color="bg-emerald-500" label="Optimized" />
           <LegendItem color="bg-orange-500" label="Moderate" />
           <LegendItem color="bg-red-500" label="Heavy" />
        </div>
      </div>
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${color}`}></div>
    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{label}</span>
  </div>
);

export default TopologyMap;