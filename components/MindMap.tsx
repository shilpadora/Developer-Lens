import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { FileNode } from '../types';

interface Props {
  data: FileNode[];
  onNodeSelect: (node: FileNode) => void;
}

const MindMap: React.FC<Props> = ({ data, onNodeSelect }) => {
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
      .scaleExtent([0.05, 10])
      .on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    // Initial root setup
    const rootData: FileNode = { name: "Root", path: "root", type: "tree", complexity: "low", children: data };
    const root = d3.hierarchy<FileNode>(rootData);

    // Collapse all nodes by default (except root children)
    root.descendants().forEach(d => {
      if (d.depth > 0) {
        (d as any)._children = d.children;
        d.children = undefined;
      }
    });

    const update = (source: d3.HierarchyNode<FileNode>) => {
      const treeLayout = d3.tree<FileNode>().nodeSize([70, 260]);
      treeLayout(root);

      const nodes = root.descendants();
      const links = root.links();

      // Normalize for fixed-depth
      nodes.forEach(d => { d.y = d.depth * 280 });

      // Links
      const link = g.selectAll(".link")
        .data(links, (d: any) => d.target.id || (d.target.id = Math.random()));

      link.enter().append("path")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", "#1e293b")
        .attr("stroke-width", 1.5)
        .merge(link as any)
        .transition().duration(500)
        .attr("d", d3.linkHorizontal<any, any>().x(d => d.y).y(d => d.x) as any);

      link.exit().remove();

      // Nodes
      const node = g.selectAll(".node")
        .data(nodes, (d: any) => d.id || (d.id = Math.random()));

      const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .on("click", (e, d: any) => {
          if (d.children) {
            d._children = d.children;
            d.children = undefined;
          } else {
            d.children = d._children;
            d._children = undefined;
          }
          update(d);
          onNodeSelect(d.data);
        })
        .style("cursor", "pointer");

      // Custom Shapes & Notations
      nodeEnter.each(function(d) {
        const el = d3.select(this);
        const name = d.data.name;
        const type = d.data.type;
        const color = d.data.complexity === 'high' ? '#ef4444' : d.data.complexity === 'medium' ? '#f59e0b' : '#10b981';

        if (type === 'tree') {
          // Real Folder Notation: Tabbed Folder Path
          el.append("path")
            .attr("d", "M-14,-10 L-14,10 L14,10 L14,-6 L4,-6 L0,-10 Z")
            .attr("fill", color)
            .attr("fill-opacity", 0.1)
            .attr("stroke", color)
            .attr("stroke-width", 2);
        } else {
          // Heuristics for logic types
          const isClass = /^[A-Z]/.test(name);
          const isMethod = /^(get|set|on|handle|use|test|_)/.test(name) || name.includes('(');

          if (isClass) {
            // Hexagon for Classes
            el.append("path")
              .attr("d", "M-12,-10 L0,-16 L12,-10 L12,10 L0,16 L-12,10 Z")
              .attr("fill", color).attr("fill-opacity", 0.1).attr("stroke", color).attr("stroke-width", 2);
          } else if (isMethod) {
            // Oval for Functions/Methods
            el.append("ellipse")
              .attr("rx", 16).attr("ry", 10)
              .attr("fill", color).attr("fill-opacity", 0.1).attr("stroke", color).attr("stroke-width", 2);
          } else {
            // File Notation: Page icon with dog-ear
            el.append("path")
              .attr("d", "M-10,-12 L6,-12 L10,-8 L10,12 L-10,12 Z")
              .attr("fill", color).attr("fill-opacity", 0.1).attr("stroke", color).attr("stroke-width", 2);
            // Dog-ear
            el.append("path")
              .attr("d", "M6,-12 L6,-8 L10,-8 Z")
              .attr("fill", color);
          }
        }
      });

      nodeEnter.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d._children || d.children ? -22 : 22)
        .attr("text-anchor", d => d._children || d.children ? "end" : "start")
        .text(d => d.data.name)
        .attr("fill", "#f8fafc")
        .style("font-size", "11px")
        .style("font-weight", "700")
        .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)");

      const nodeUpdate = nodeEnter.merge(node as any);
      nodeUpdate.transition().duration(500)
        .attr("transform", d => `translate(${d.y},${d.x})`);

      node.exit().remove();
    };

    update(root as any);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width/6, height/2).scale(0.85));

    const ro = new ResizeObserver(() => {
      svg.attr("width", container.clientWidth).attr("height", container.clientHeight);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [data]);

  return (
    <div className="w-full h-full bg-slate-950 overflow-hidden relative cursor-grab active:cursor-grabbing">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default MindMap;