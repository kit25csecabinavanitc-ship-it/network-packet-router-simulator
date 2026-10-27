/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  RouterNode,
  NetworkLink,
  NetworkPacket,
} from '../types/network';
import {
  Server,
  Zap,
  AlertTriangle,
  Radio,
  Send,
  Power,
  Edit2,
  Trash2,
  Plus,
  Minimize2,
  Maximize2,
  HelpCircle,
} from 'lucide-react';

interface NetworkCanvasProps {
  nodes: RouterNode[];
  links: NetworkLink[];
  packets: NetworkPacket[];
  selectedNodeId: string | null;
  highlightedPath?: string[];
  onSelectNode: (nodeId: string) => void;
  onSelectPacket?: (packet: NetworkPacket) => void;
  onUpdateNodePosition: (nodeId: string, x: number, y: number) => void;
  onToggleNodeStatus: (nodeId: string) => void;
  onToggleLinkStatus: (linkId: string) => void;
  onUpdateLinkWeight: (linkId: string, weight: number) => void;
  onUpdateLinkLoss?: (linkId: string, lossPercent: number) => void;
  onDeleteLink: (linkId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddLink: (source: string, target: string, weight: number, isDirectional: boolean) => void;
  onAddNode: (name: string, role: RouterNode['role']) => void;
  onQuickSendPacket: (sourceId: string, destId: string) => void;
  negativeCycleEdges: string[];
  negativeCycleNodes: string[];
}

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  nodes,
  links,
  packets,
  selectedNodeId,
  highlightedPath,
  onSelectNode,
  onSelectPacket,
  onUpdateNodePosition,
  onToggleNodeStatus,
  onToggleLinkStatus,
  onUpdateLinkWeight,
  onUpdateLinkLoss,
  onDeleteLink,
  onDeleteNode,
  onAddLink,
  onAddNode,
  onQuickSendPacket,
  negativeCycleEdges,
  negativeCycleNodes,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Connect link mode
  const [connectStartNodeId, setConnectStartNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Edit Link Modal / Quick Edit
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editWeightVal, setEditWeightVal] = useState<number>(10);
  const [editLossVal, setEditLossVal] = useState<number>(0);

  // New Node Modal state
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeRole, setNewNodeRole] = useState<RouterNode['role']>('core');

  // New Link Modal state
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [newLinkSource, setNewLinkSource] = useState('');
  const [newLinkTarget, setNewLinkTarget] = useState('');
  const [newLinkWeight, setNewLinkWeight] = useState(15);
  const [newLinkDirectional, setNewLinkDirectional] = useState(false);

  // Dragging event handlers
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (connectStartNodeId) {
      if (connectStartNodeId !== nodeId) {
        onAddLink(connectStartNodeId, nodeId, 15, false);
      }
      setConnectStartNodeId(null);
      return;
    }

    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: mouseX - node.x,
      y: mouseY - node.y,
    });
    onSelectNode(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setMousePos({ x: currentX, y: currentY });

    if (draggingNodeId) {
      const clampedX = Math.max(50, Math.min(rect.width - 50, currentX - dragOffset.x));
      const clampedY = Math.max(50, Math.min(rect.height - 50, currentY - dragOffset.y));
      onUpdateNodePosition(draggingNodeId, Math.round(clampedX), Math.round(clampedY));
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Node map for fast lookup
  const nodeMap = new Map<string, RouterNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const startNode = connectStartNodeId ? nodeMap.get(connectStartNodeId) : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[620px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden select-none shadow-2xl"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setDraggingNodeId(null);
        setConnectStartNodeId(null);
      }}
    >
      {/* Background Cyber Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0),
            linear-gradient(to right, rgba(56, 189, 248, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px, 120px 120px, 120px 120px',
        }}
      />

      {/* Negative Cycle Warning Banner */}
      {negativeCycleEdges.length > 0 && (
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-2 bg-red-950/90 border border-red-500/70 text-red-200 px-4 py-2 rounded-lg text-xs font-mono shadow-lg shadow-red-950/50 backdrop-blur-md animate-pulse">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            <strong>ROUTING LOOP / NEGATIVE CYCLE ACTIVE:</strong> Metric decreases unboundedly along{' '}
            {negativeCycleNodes.join(' → ')}!
          </span>
        </div>
      )}

      {/* Canvas Floating Quick Controls */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg backdrop-blur-md shadow-md text-xs">
        <button
          onClick={() => {
            setShowAddNodeModal(true);
            setNewNodeName(`R${nodes.length + 1}`);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition cursor-pointer"
          title="Add a new Router to the topology"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Router</span>
        </button>

        <button
          onClick={() => {
            if (nodes.length >= 2) {
              setNewLinkSource(nodes[0].id);
              setNewLinkTarget(nodes[1].id);
              setShowAddLinkModal(true);
            }
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition cursor-pointer"
          title="Create a link between two routers"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Add Link</span>
        </button>

        <button
          onClick={() => {
            if (connectStartNodeId) {
              setConnectStartNodeId(null);
            } else if (selectedNodeId) {
              setConnectStartNodeId(selectedNodeId);
            } else if (nodes.length > 0) {
              setConnectStartNodeId(nodes[0].id);
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium transition cursor-pointer ${
            connectStartNodeId
              ? 'bg-amber-500 text-slate-950 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title="Click to start interactive link drag"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>{connectStartNodeId ? `Click Target for ${connectStartNodeId}` : 'Wire Link'}</span>
        </button>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        <div className="text-[11px] text-slate-400 px-1 font-mono flex items-center gap-2">
          <span>Routers: <strong className="text-sky-400">{nodes.length}</strong></span>
          <span>Links: <strong className="text-amber-400">{links.length}</strong></span>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        <div className="flex items-center gap-1 font-mono text-[10px]">
          <button
            onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))))}
            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
            title="Zoom Out"
          >
            -
          </button>
          <span className="text-slate-400 w-8 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded cursor-pointer"
            title="Reset Zoom"
          >
            1x
          </button>
        </div>
      </div>

      {/* SVG Layer for Links, Direction Arrows, and In-Flight Packets */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="28"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#38bdf8" />
          </marker>
          <marker
            id="arrowhead-loop"
            markerWidth="10"
            markerHeight="7"
            refX="28"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Render Links */}
        {links.map((link) => {
          const u = nodeMap.get(link.source);
          const v = nodeMap.get(link.target);
          if (!u || !v) return null;

          const isDown = link.status === 'down' || u.status === 'down' || v.status === 'down';
          const isNegativeCycle = negativeCycleEdges.includes(link.id);
          const isNegativeWeight = link.weight < 0;

          const midX = (u.x + v.x) / 2;
          const midY = (u.y + v.y) / 2;

          let strokeColor = '#475569';
          if (isDown) strokeColor = '#334155';
          else if (isNegativeCycle) strokeColor = '#ef4444';
          else if (isNegativeWeight) strokeColor = '#f59e0b';
          else strokeColor = '#0284c7';

          return (
            <g key={link.id} className="pointer-events-auto">
              {/* Invisible wide line for easier clicking */}
              <line
                x1={u.x}
                y1={u.y}
                x2={v.x}
                y2={v.y}
                stroke="transparent"
                strokeWidth={24}
                className="cursor-pointer"
                onClick={() => {
                  setEditingLinkId(link.id);
                  setEditWeightVal(link.weight);
                }}
              />

              {/* Glowing background for negative cycle */}
              {isNegativeCycle && !isDown && (
                <line
                  x1={u.x}
                  y1={u.y}
                  x2={v.x}
                  y2={v.y}
                  stroke="#ef4444"
                  strokeWidth={8}
                  opacity={0.4}
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
              )}

              {/* Main Link Line */}
              <line
                x1={u.x}
                y1={u.y}
                x2={v.x}
                y2={v.y}
                stroke={strokeColor}
                strokeWidth={isNegativeCycle ? 3.5 : isDown ? 1.5 : 2.5}
                strokeDasharray={isDown ? '5 5' : undefined}
                markerEnd={
                  link.isDirectional && !isDown
                    ? isNegativeCycle
                      ? 'url(#arrowhead-loop)'
                      : 'url(#arrowhead)'
                    : undefined
                }
                filter={isNegativeCycle ? 'url(#glow)' : undefined}
              />

              {/* Link Weight / Latency Badge */}
              <g
                transform={`translate(${midX}, ${midY})`}
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => {
                  setEditingLinkId(link.id);
                  setEditWeightVal(link.weight);
                }}
              >
                <rect
                  x={-28}
                  y={-12}
                  width={56}
                  height={24}
                  rx={6}
                  fill={
                    isDown
                      ? '#1e293b'
                      : isNegativeCycle
                      ? '#450a0a'
                      : isNegativeWeight
                      ? '#451a03'
                      : '#0f172a'
                  }
                  stroke={
                    isDown
                      ? '#475569'
                      : isNegativeCycle
                      ? '#ef4444'
                      : isNegativeWeight
                      ? '#f59e0b'
                      : '#38bdf8'
                  }
                  strokeWidth={1.5}
                />
                <text
                  textAnchor="middle"
                  dy={4}
                  fill={
                    isDown
                      ? '#94a3b8'
                      : isNegativeCycle
                      ? '#fca5a5'
                      : isNegativeWeight
                      ? '#fcd34d'
                      : '#38bdf8'
                  }
                  fontSize={11}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {isDown ? 'DOWN' : `${link.weight}ms`}
                </text>
              </g>
            </g>
          );
        })}

        {/* Temporary Wire while dragging to connect */}
        {startNode && (
          <line
            x1={startNode.x}
            y1={startNode.y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4 4"
            className="animate-pulse"
          />
        )}

        {/* Highlighted Shortest Path Overlay */}
        {highlightedPath && highlightedPath.length >= 2 && (
          <g className="pointer-events-none">
            {highlightedPath.map((nodeId, idx) => {
              if (idx === highlightedPath.length - 1) return null;
              const u = nodeMap.get(nodeId);
              const v = nodeMap.get(highlightedPath[idx + 1]);
              if (!u || !v) return null;
              return (
                <line
                  key={`hl-path-${idx}`}
                  x1={u.x}
                  y1={u.y}
                  x2={v.x}
                  y2={v.y}
                  stroke="#06b6d4"
                  strokeWidth={5}
                  opacity={0.75}
                  strokeDasharray="8 4"
                  className="animate-pulse"
                />
              );
            })}
          </g>
        )}

        {/* Render Packets in flight */}
        {packets
          .filter((p) => p.status === 'in_transit')
          .map((packet) => {
            const curr = nodeMap.get(packet.currentHopId);
            const target = nodeMap.get(packet.targetHopId);
            if (!curr || !target) return null;

            // Linear interpolation of position based on progress 0..1
            const px = curr.x + (target.x - curr.x) * packet.progress;
            const py = curr.y + (target.y - curr.y) * packet.progress;

            return (
              <g
                key={packet.id}
                transform={`translate(${px}, ${py})`}
                className="cursor-pointer transition-transform hover:scale-125"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPacket?.(packet);
                }}
              >
                {/* Glow ring */}
                <circle r={14} fill={packet.color} opacity={0.3} className="animate-ping" />
                {/* Packet body */}
                <circle r={8} fill={packet.color} stroke="#ffffff" strokeWidth={2} />
                {/* Packet Label */}
                <rect
                  x={12}
                  y={-14}
                  width={64}
                  height={18}
                  rx={4}
                  fill="#020617"
                  stroke={packet.color}
                  strokeWidth={1}
                />
                <text
                  x={44}
                  y={-2}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={9}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  TTL:{packet.ttl}
                </text>
              </g>
            );
          })}
      </svg>

      {/* HTML Layer for Draggable Router Nodes */}
      {nodes.map((node) => {
        const isSelected = selectedNodeId === node.id;
        const isDown = node.status === 'down';
        const inNegativeCycle = negativeCycleNodes.includes(node.id);

        let roleBadge = 'Core';
        let roleBg = 'bg-sky-950 text-sky-400 border-sky-700';
        if (node.role === 'gateway') {
          roleBadge = 'GW';
          roleBg = 'bg-purple-950 text-purple-400 border-purple-700';
        } else if (node.role === 'edge') {
          roleBadge = 'Edge';
          roleBg = 'bg-emerald-950 text-emerald-400 border-emerald-700';
        } else if (node.role === 'cloud') {
          roleBadge = 'Cloud';
          roleBg = 'bg-cyan-950 text-cyan-400 border-cyan-700';
        }

        return (
          <div
            key={node.id}
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            className={`absolute z-10 flex flex-col items-center cursor-grab active:cursor-grabbing group transition-shadow ${
              isDown ? 'opacity-60 grayscale' : ''
            }`}
          >
            {/* Router Node Circle / Chassis */}
            <div
              className={`relative flex items-center justify-center w-16 h-16 rounded-full border-2 transition-all duration-200 ${
                isDown
                  ? 'bg-slate-900 border-slate-700 text-slate-500 shadow-none'
                  : inNegativeCycle
                  ? 'bg-red-950/90 border-red-500 text-red-200 shadow-lg shadow-red-500/50 ring-4 ring-red-500/30 animate-pulse'
                  : isSelected
                  ? 'bg-sky-950/90 border-sky-400 text-sky-200 shadow-lg shadow-sky-500/40 ring-4 ring-sky-500/20'
                  : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:border-sky-500 hover:shadow-md'
              }`}
            >
              <Server className="w-6 h-6" />

              {/* AS badge */}
              <span
                className={`absolute -top-2.5 px-1.5 py-0.5 rounded text-[9px] font-mono border ${roleBg}`}
              >
                AS{node.asNumber}
              </span>

              {/* Status Indicator LED */}
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                  isDown ? 'bg-slate-600' : 'bg-emerald-400 shadow-sm shadow-emerald-400'
                }`}
              />
            </div>

            {/* Label and IP */}
            <div className="mt-1.5 flex flex-col items-center pointer-events-none">
              <span className="text-xs font-bold text-slate-100 tracking-wide font-mono flex items-center gap-1">
                {node.name} ({node.id})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{node.ip}</span>
            </div>

            {/* Quick Context Hover Actions */}
            <div className="absolute -top-9 hidden group-hover:flex items-center gap-1 bg-slate-900/95 border border-slate-700 px-1.5 py-1 rounded-md shadow-xl backdrop-blur-sm z-30">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleNodeStatus(node.id);
                }}
                className={`p-1 rounded text-xs transition cursor-pointer ${
                  isDown ? 'text-emerald-400 hover:bg-emerald-950' : 'text-red-400 hover:bg-red-950'
                }`}
                title={isDown ? 'Bring Router UP' : 'Shut Router DOWN'}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const target = nodes.find((n) => n.id !== node.id && n.status === 'up');
                  if (target) {
                    onQuickSendPacket(node.id, target.id);
                  }
                }}
                className="p-1 rounded text-sky-400 hover:bg-sky-950 text-xs transition cursor-pointer"
                title="Send test packet from this router"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (nodes.length > 2) {
                    onDeleteNode(node.id);
                  }
                }}
                className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 text-xs transition cursor-pointer"
                title="Delete router"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Link Edit / Inspector Modal */}
      {editingLinkId && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-sm shadow-2xl">
            {(() => {
              const link = links.find((l) => l.id === editingLinkId);
              if (!link) return null;
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Link: {link.source} ➔ {link.target}
                    </h3>
                    <button
                      onClick={() => setEditingLinkId(null)}
                      className="text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Link Latency Metric (ms):
                      <span className="text-amber-400 ml-1 font-mono">{editWeightVal} ms</span>
                    </label>
                    <input
                      type="number"
                      value={editWeightVal}
                      onChange={(e) => setEditWeightVal(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-sm focus:border-sky-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      *Negative values (e.g. -5ms) can trigger negative cycle / routing loop detection!
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => {
                        onToggleLinkStatus(link.id);
                        setEditingLinkId(null);
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                        link.status === 'up'
                          ? 'bg-red-950 text-red-300 border border-red-700 hover:bg-red-900'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
                      }`}
                    >
                      {link.status === 'up' ? 'Sever Link (Down)' : 'Restore Link (Up)'}
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onDeleteLink(link.id);
                          setEditingLinkId(null);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-red-950 text-red-400 rounded text-xs font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          onUpdateLinkWeight(link.id, editWeightVal);
                          setEditingLinkId(null);
                        }}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add Router Modal */}
      {showAddNodeModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
              <Server className="w-4 h-4 text-sky-400" />
              Add New Router Node
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Router Name / Hostname</label>
              <input
                type="text"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-sm focus:border-sky-500 focus:outline-none"
                placeholder="R7"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Router Role</label>
              <select
                value={newNodeRole}
                onChange={(e) => setNewNodeRole(e.target.value as RouterNode['role'])}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-sm focus:border-sky-500 focus:outline-none"
              >
                <option value="core">Core Backbone (AS64512)</option>
                <option value="gateway">BGP / Edge Gateway</option>
                <option value="edge">Access / Branch Edge</option>
                <option value="cloud">Cloud VPC Node</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddNodeModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newNodeName.trim()) {
                    onAddNode(newNodeName.trim(), newNodeRole);
                    setShowAddNodeModal(false);
                  }
                }}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Create Router
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {showAddLinkModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
              <Zap className="w-4 h-4 text-amber-400" />
              Add Network Link
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Source</label>
                <select
                  value={newLinkSource}
                  onChange={(e) => setNewLinkSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs font-mono"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Destination</label>
                <select
                  value={newLinkTarget}
                  onChange={(e) => setNewLinkTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs font-mono"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Latency Metric (ms)</label>
              <input
                type="number"
                value={newLinkWeight}
                onChange={(e) => setNewLinkWeight(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="directional-check"
                checked={newLinkDirectional}
                onChange={(e) => setNewLinkDirectional(e.target.checked)}
                className="rounded border-slate-700 text-sky-600 focus:ring-0"
              />
              <label htmlFor="directional-check" className="text-xs text-slate-300">
                Directional Link ({newLinkSource} ➔ {newLinkTarget} only)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddLinkModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newLinkSource && newLinkTarget && newLinkSource !== newLinkTarget) {
                    onAddLink(newLinkSource, newLinkTarget, newLinkWeight, newLinkDirectional);
                    setShowAddLinkModal(false);
                  }
                }}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Create Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Helper Footer */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-3 bg-slate-900/80 border border-slate-800/80 px-3 py-1.5 rounded-lg backdrop-blur-sm text-[11px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          Drag router to reposition
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Click link to adjust metric / cut cable
        </span>
      </div>
    </div>
  );
};
