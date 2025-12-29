
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { FileNode, RepoProject } from '../types';
import { GitHubService } from '../services/githubService';
import { ParserService } from '../services/parserService';

interface Props {
  data: FileNode[];
  project?: RepoProject;
  onNodeSelect: (node: FileNode) => void;
}

const MindMap: React.FC<Props> = ({ data, project, onNodeSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);

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

    const rootData: FileNode = { name: project?.name || "Repository", path: "root", type: "tree", kind: 'folder', complexity: "low", children: data };
    const root = d3.hierarchy<FileNode>(rootData);

    root.descendants().forEach(d => {
      if (d.depth >= 1 && d.children) {
        (d as any)._children = d.children;
        d.children = undefined;
      }
    });

    const update = (source: d3.HierarchyNode<FileNode>) => {
      const treeLayout = d3.tree<FileNode>().nodeSize([70, 260]);
      treeLayout(root);

      const nodes = root.descendants();
      const links = root.links();

      nodes.forEach(d => { d.y = d.depth * 240 });

      const linkSelection = g.selectAll(".link")
        .data(links, (d: any) => d.target.id || (d.target.id = Math.random()));

      linkSelection.enter().append("path")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", "#1e293b")
        .attr("stroke-width", 1.5)
        .merge(linkSelection as any)
        .transition().duration(600)
        .attr("d", d3.linkHorizontal<any, any>().x(d => d.y).y(d => d.x) as any);

      linkSelection.exit().remove();

      const nodeSelection = g.selectAll(".node")
        .data(nodes, (d: any) => d.id || (d.id = Math.random()));

      const nodeEnter = nodeSelection.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .style("cursor", "pointer");

      const nodeUpdate = nodeEnter.merge(nodeSelection as any);

      nodeUpdate.on("click", async (e, d: any) => {
        e.stopPropagation();
        onNodeSelect(d.data);

        // Folders, Classes, and Files can expand
        const kind = d.data.kind || (d.data.type === 'tree' ? 'folder' : 'file');

        if (kind === 'folder' || kind === 'class') {
          if (d.children) { d._children = d.children; d.children = undefined; }
          else { d.children = d._children; d._children = undefined; }
          update(d);
        } else if (kind === 'file' && project) {
          if (d.children || d._children) {
            if (d.children) { d._children = d.children; d.children = undefined; }
            else { d.children = d._children; d._children = undefined; }
            update(d);
          } else {
            setLoadingPath(d.data.path);
            try {
              const content = await GitHubService.getFile(project.owner, project.name, d.data.path, project.token);
              const structure = ParserService.parseCodeStructure(content, d.data.name);
              if (structure.length > 0) {
                const subRoot = d3.hierarchy({ ...d.data, children: structure });
                d.children = subRoot.children;
                if (d.children) {
                  const updateDepth = (node: any, depth: number) => {
                    node.depth = depth;
                    if (node.children) node.children.forEach((c: any) => updateDepth(c, depth + 1));
                    if (node._children) node._children.forEach((c: any) => updateDepth(c, depth + 1));
                  };
                  d.children.forEach((c: any) => {
                    c.parent = d;
                    updateDepth(c, d.depth + 1);
                  });
                }
                update(d);
              }
            } finally { setLoadingPath(null); }
          }
        }
      });

      nodeEnter.each(function (d) {
        const el = d3.select(this);
        const kind = d.data.kind || (d.data.type === 'tree' ? 'folder' : 'file');
        const complexityColor = d.data.complexity === 'high' ? '#ef4444' : d.data.complexity === 'medium' ? '#f59e0b' : '#10b981';

        if (kind === 'folder') {
          el.append("path")
            .attr("d", "M-15,-11 L-15,11 L15,11 L15,-6 L4,-6 L0,-11 Z")
            .attr("fill", complexityColor).attr("fill-opacity", 0.2).attr("stroke", complexityColor).attr("stroke-width", 2);
        } else if (kind === 'file') {
          el.append("path")
            .attr("d", "M-10,-13 L6,-13 L10,-9 L10,13 L-10,13 Z")
            .attr("fill", complexityColor).attr("fill-opacity", 0.1).attr("stroke", complexityColor).attr("stroke-width", 2);
        } else if (kind === 'class') {
          // Hexagon shape
          el.append("path")
            .attr("d", "M-12,0 L-6,-10 L6,-10 L12,0 L6,10 L-6,10 Z")
            .attr("fill", "#3b82f6").attr("fill-opacity", 0.3).attr("stroke", "#3b82f6").attr("stroke-width", 2);
        } else if (kind === 'function') {
          // Oval (Ellipse) shape
          el.append("ellipse")
            .attr("rx", 15).attr("ry", 8)
            .attr("fill", "#10b981").attr("fill-opacity", 0.3).attr("stroke", "#10b981").attr("stroke-width", 2);
        }
      });

      nodeEnter.append("text")
        .attr("dy", "0.31em")
        .attr("x", 25)
        .attr("text-anchor", "start")
        .text(d => d.data.name)
        .attr("fill", "#f8fafc")
        .style("font-size", "11px")
        .style("font-weight", "700")
        .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)");

      nodeUpdate.transition().duration(600).attr("transform", d => `translate(${d.y},${d.x})`);
      nodeSelection.exit().remove();
    };

    update(root as any);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 8, height / 2).scale(0.8));

    const ro = new ResizeObserver(() => svg.attr("width", container.clientWidth).attr("height", container.clientHeight));
    ro.observe(container);
    return () => ro.disconnect();
  }, [data, project, onNodeSelect]);

  return (
    <div className="w-full h-full bg-slate-950 overflow-hidden relative cursor-grab active:cursor-grabbing">
      <svg ref={svgRef} className="w-full h-full" />
      {loadingPath && (
        <div className="absolute top-8 right-8 bg-slate-900/80 border border-emerald-500/20 px-5 py-3 rounded-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Deconstructing Logic...</span>
        </div>
      )}
    </div>
  );
};

export default MindMap;
