
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { FileNode } from '../types';

interface Props {
  data: FileNode[];
}

const MindMap: React.FC<Props> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));

    svg.call(zoom);

    // Create hierarchy
    const rootData = { name: "Root", children: data, complexity: 'low' as const, path: 'root', type: 'tree' as const };
    const root = d3.hierarchy<FileNode>(rootData as any);
    
    const treeLayout = d3.tree<FileNode>().size([height - 100, width - 200]);
    treeLayout(root as any);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal<any, any>()
        .x(d => d.y)
        .y(d => d.x) as any)
      .attr("fill", "none")
      .attr("stroke", "#334155")
      .attr("stroke-width", 1.5);

    // Nodes
    const nodes = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    nodes.append("circle")
      .attr("r", 6)
      .attr("fill", d => {
        const c = (d.data as any).complexity;
        if (c === 'high') return '#ef4444';
        if (c === 'medium') return '#f97316';
        return '#10b981';
      });

    nodes.append("text")
      .attr("dy", ".31em")
      .attr("x", d => d.children ? -10 : 10)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .text(d => (d.data as any).name)
      .attr("fill", "#f8fafc")
      .style("font-size", "10px")
      .style("font-weight", "500");

    // Initial positioning
    const initialTransform = d3.zoomIdentity.translate(100, 50).scale(0.8);
    svg.call(zoom.transform, initialTransform);

  }, [data]);

  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden relative border border-slate-800 rounded-lg">
      <svg ref={svgRef} className="w-full h-full cursor-move" />
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 p-3 bg-slate-800/80 rounded border border-slate-700 backdrop-blur-sm text-xs text-slate-400">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Low Complexity</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Medium Complexity</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> High Complexity</div>
      </div>
    </div>
  );
};

export default MindMap;
