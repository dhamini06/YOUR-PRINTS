'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Entity, Relationship } from '@/lib/types';
import { ZoomIn, ZoomOut, RotateCcw, Pause, Play, Eye } from 'lucide-react';

interface NetworkGraphProps {
  entities: Entity[];
  relationships: Relationship[];
  onSelectEntity: (entity: Entity) => void;
  onSelectRelationship: (relationship: Relationship) => void;
  selectedEntityId?: string | null;
  selectedRelationshipId?: string | null;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  canonical_value: string;
  entity_type: string;
  display_label: string;
  attributes: Record<string, any>;
  originalEntity: Entity;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  source: D3Node | string;
  target: D3Node | string;
  relationship_type: string;
  confidence: string;
  inference_rationale: string;
  originalRelationship: Relationship;
}

export default function NetworkGraph({
  entities,
  relationships,
  onSelectEntity,
  onSelectRelationship,
  selectedEntityId,
  selectedRelationshipId,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || entities.length === 0) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 550;

    // Clear previous SVG content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Map domain entities & relationships to D3 graph format
    const nodes: D3Node[] = entities.map((e) => ({
      id: e.id,
      canonical_value: e.canonical_value,
      entity_type: e.entity_type,
      display_label: e.display_label,
      attributes: e.attributes || {},
      originalEntity: e,
    }));

    const nodeMap = new Map<string, D3Node>(nodes.map((n) => [n.id, n]));

    const links: D3Link[] = relationships
      .filter((r) => nodeMap.has(r.source_entity_id) && nodeMap.has(r.target_entity_id))
      .map((r) => ({
        id: r.id,
        source: r.source_entity_id,
        target: r.target_entity_id,
        relationship_type: r.relationship_type,
        confidence: r.confidence,
        inference_rationale: r.inference_rationale,
        originalRelationship: r,
      }));

    // Main Graph Container with Zoom support
    const g = svg.append('g').attr('class', 'graph-container');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Force Simulation
    const simulation = d3
      .forceSimulation<D3Node>(nodes)
      .force(
        'link',
        d3
          .forceLink<D3Node, D3Link>(links)
          .id((d) => d.id)
          .distance((d) => (d.relationship_type === 'HOSTED_ON' ? 90 : 130))
      )
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35));

    simulationRef.current = simulation;

    // Render Arrowhead markers for directional links
    const defs = svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'arrow-confirmed')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 24)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#111110');

    // Draw Links (Edges)
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        if (d.confidence === 'CONFIRMED_ASSOCIATION') return '#111110';
        if (d.confidence === 'STRONG_MATCH') return '#111110';
        if (d.confidence === 'POSSIBLE_MATCH') return '#64635E';
        return '#9E9D97';
      })
      .attr('stroke-width', (d) => (d.confidence === 'CONFIRMED_ASSOCIATION' ? 1.5 : 1))
      .attr('stroke-dasharray', (d) => {
        if (d.confidence === 'STRONG_MATCH') return '4 3';
        if (d.confidence === 'POSSIBLE_MATCH') return '2 3';
        if (d.confidence === 'WEAK_SIGNAL') return '1 4';
        return 'none';
      })
      .attr('marker-end', 'url(#arrow-confirmed)')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelectRelationship(d.originalRelationship);
      });

    // Draw Nodes
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, D3Node>()
          .on('start', (event, d) => {
            if (!event.active && !isPaused) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active && !isPaused) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelectEntity(d.originalEntity);
      });

    // Outer Selection Halo
    node
      .append('circle')
      .attr('r', (d) => (d.entity_type === 'EMAIL_TARGET' ? 24 : 18))
      .attr('fill', 'none')
      .attr('stroke', (d) => (d.id === selectedEntityId ? '#C8FF00' : 'transparent'))
      .attr('stroke-width', 3);

    // Main Node Shapes
    node
      .append('circle')
      .attr('r', (d) => (d.entity_type === 'EMAIL_TARGET' ? 18 : 13))
      .attr('fill', (d) => {
        if (d.entity_type === 'EMAIL_TARGET') return '#111110';
        if (d.entity_type === 'PUBLIC_ACCOUNT') return '#FBFBFA';
        if (d.entity_type === 'USERNAME') return '#F4F3EF';
        return '#FFFFFF';
      })
      .attr('stroke', '#111110')
      .attr('stroke-width', 1);

    // Node Icons / Text Indicators inside Circle
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-family', 'Geist Mono, monospace')
      .attr('font-size', (d) => (d.entity_type === 'EMAIL_TARGET' ? '11px' : '9px'))
      .attr('fill', (d) => (d.entity_type === 'EMAIL_TARGET' ? '#C8FF00' : '#111110'))
      .text((d) => {
        if (d.entity_type === 'EMAIL_TARGET') return '●';
        if (d.entity_type === 'USERNAME') return '@';
        if (d.entity_type === 'PUBLIC_ACCOUNT') return 'acc';
        if (d.entity_type === 'DOMAIN') return 'dns';
        if (d.entity_type === 'ORGANIZATION') return 'org';
        return 'ref';
      });

    // Node Labels
    node
      .append('text')
      .attr('x', 0)
      .attr('y', 24)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', '10px')
      .attr('font-weight', (d) => (d.entity_type === 'EMAIL_TARGET' ? '600' : '400'))
      .attr('fill', '#111110')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#FBFBFA')
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round')
      .text((d) => {
        const label = d.display_label;
        return label.length > 20 ? label.slice(0, 18) + '…' : label;
      });

    // Simulation Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as D3Node).x || 0)
        .attr('y1', (d) => (d.source as D3Node).y || 0)
        .attr('x2', (d) => (d.target as D3Node).x || 0)
        .attr('y2', (d) => (d.target as D3Node).y || 0);

      node.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [entities, relationships, selectedEntityId, isPaused, onSelectEntity, onSelectRelationship]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.75);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(350)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  const togglePhysics = () => {
    if (simulationRef.current) {
      if (isPaused) {
        simulationRef.current.alphaTarget(0.1).restart();
      } else {
        simulationRef.current.stop();
      }
      setIsPaused(!isPaused);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] relative bg-[#FBFBFA] border border-[#E5E4DE] shadow-subtle overflow-hidden select-none"
    >
      {/* Background Coordinate Grid */}
      <div className="absolute inset-0 hairline-grid opacity-50 pointer-events-none" />

      {/* SVG Canvas */}
      <svg ref={svgRef} className="w-full h-full relative z-10 cursor-grab active:cursor-grabbing" />

      {/* Floating Control Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center bg-white border border-[#E5E4DE] shadow-subtle text-xs font-mono">
        <button
          onClick={handleZoomIn}
          className="p-2 text-[#111110] hover:bg-[#F4F3EF] border-r border-[#E5E4DE]"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 text-[#111110] hover:bg-[#F4F3EF] border-r border-[#E5E4DE]"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 text-[#111110] hover:bg-[#F4F3EF] border-r border-[#E5E4DE]"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={togglePhysics}
          className="p-2 text-[#111110] hover:bg-[#F4F3EF]"
          title={isPaused ? 'Resume Physics' : 'Pause Physics'}
        >
          {isPaused ? <Play className="w-4 h-4 text-[#C5221F]" /> : <Pause className="w-4 h-4" />}
        </button>
      </div>

      {/* Epistemological Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-sm border border-[#E5E4DE] p-3 text-[10px] font-mono space-y-2 shadow-subtle pointer-events-none">
        <div className="font-bold text-[#111110] uppercase tracking-wider border-b border-[#E5E4DE] pb-1">
          RELATIONSHIP CONFIDENCE
        </div>
        <div className="space-y-1 text-[#64635E]">
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-[#111110] inline-block"></span>
            <span className="text-[#111110] font-semibold">CONFIRMED (Direct proof)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 border-b border-dashed border-[#111110] inline-block"></span>
            <span>STRONG MATCH (Corroborated)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 border-b border-dotted border-[#64635E] inline-block"></span>
            <span>POSSIBLE MATCH (Uncorroborated)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 border-b border-dotted border-[#9E9D97] inline-block"></span>
            <span>WEAK SIGNAL (Dictionary penalty)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
