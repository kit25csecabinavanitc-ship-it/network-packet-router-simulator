/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RouterNode,
  NetworkLink,
  NetworkPacket,
  PacketLogEntry,
} from './types/network';
import { PRESET_TOPOLOGIES, TopologyPreset } from './data/presetTopologies';
import {
  runBellmanFord,
  runFloydWarshall,
  getNextHopNodeId,
} from './utils/algorithms';
import { NetworkCanvas } from './components/NetworkCanvas';
import { BellmanFordViewer } from './components/BellmanFordViewer';
import { FloydWarshallViewer } from './components/FloydWarshallViewer';
import { RoutingTableViewer } from './components/RoutingTableViewer';
import { CliTerminal } from './components/CliTerminal';
import { ReferenceCodeViewer } from './components/ReferenceCodeViewer';
import { PacketInspector } from './components/PacketInspector';
import { PacketHeaderModal } from './components/PacketHeaderModal';
import { TopologyManagerModal } from './components/TopologyManagerModal';
import {
  Server,
  Network,
  Activity,
  Terminal,
  Grid,
  FileCode,
  RotateCcw,
  Play,
  Pause,
  AlertTriangle,
  Zap,
  Globe,
  Sliders,
  Sparkles,
  FileJson,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function App() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('as-backbone');
  const [nodes, setNodes] = useState<RouterNode[]>(PRESET_TOPOLOGIES[0].nodes);
  const [links, setLinks] = useState<NetworkLink[]>(PRESET_TOPOLOGIES[0].links);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('NYC');
  const [highlightedPath, setHighlightedPath] = useState<string[] | undefined>(undefined);
  const [activeRoutingEngine, setActiveRoutingEngine] = useState<'Bellman-Ford' | 'Floyd-Warshall'>('Bellman-Ford');

  const [activeTab, setActiveTab] = useState<
    'canvas' | 'bellman-ford' | 'floyd-warshall' | 'routing-tables' | 'cli' | 'code'
  >('canvas');

  // Packets & simulation state
  const [packets, setPackets] = useState<NetworkPacket[]>([]);
  const [packetLogs, setPacketLogs] = useState<PacketLogEntry[]>([]);
  const [isSimPaused, setIsSimPaused] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 0.5x, 1x, 2x, 4x

  // Deep Packet Header Modal & Topology JSON Modal
  const [inspectingPacket, setInspectingPacket] = useState<NetworkPacket | null>(null);
  const [isTopologyModalOpen, setIsTopologyModalOpen] = useState(false);

  // Continuous Traffic Generator
  const [isTrafficGenActive, setIsTrafficGenActive] = useState(false);
  const [trafficRate, setTrafficRate] = useState<number>(2); // packets per sec

  // Animation frame ref
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Global Negative Cycle Check
  const negativeCycleInfo = React.useMemo(() => {
    const activeNodes = nodes.filter((n) => n.status === 'up');
    for (const node of activeNodes) {
      const bf = runBellmanFord(nodes, links, node.id);
      if (bf.hasNegativeCycle) {
        return {
          hasNegativeCycle: true,
          edges: bf.negativeCycleEdges,
          nodes: bf.negativeCyclePath,
        };
      }
    }
    return { hasNegativeCycle: false, edges: [], nodes: [] };
  }, [nodes, links]);

  // Telemetry statistics
  const telemetryStats = React.useMemo(() => {
    const totalSent = packets.length;
    const delivered = packets.filter((p) => p.status === 'delivered');
    const dropped = packets.filter(
      (p) =>
        p.status === 'dropped_ttl' ||
        p.status === 'dropped_loop' ||
        p.status === 'dropped_unreachable' ||
        p.status === 'dropped_packet_loss'
    );

    const avgLatency =
      delivered.length > 0
        ? Math.round(delivered.reduce((acc, p) => acc + p.totalLatency, 0) / delivered.length)
        : 0;

    const lossRate = totalSent > 0 ? (dropped.length / totalSent) * 100 : 0;
    // Estimated Mbps based on packet rate and payload size
    const throughput = isTrafficGenActive ? trafficRate * 4.8 : delivered.length > 0 ? 12.4 : 0;

    return {
      throughputMbps: throughput,
      packetLossRate: lossRate,
      avgLatencyMs: avgLatency,
    };
  }, [packets, isTrafficGenActive, trafficRate]);

  // Load Preset
  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = PRESET_TOPOLOGIES.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPresetId(preset.id);
      setNodes(JSON.parse(JSON.stringify(preset.nodes)));
      setLinks(JSON.parse(JSON.stringify(preset.links)));
      setSelectedNodeId(preset.nodes[0]?.id || '');
      setPackets([]);
      setHighlightedPath(undefined);
    }
  }, []);

  // Update Node Position
  const handleUpdateNodePosition = (nodeId: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, x, y } : n))
    );
  };

  // Toggle Router Node Up/Down
  const handleToggleNodeStatus = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, status: n.status === 'up' ? 'down' : 'up' } : n
      )
    );
  };

  // Toggle Link Up/Down
  const handleToggleLinkStatus = (linkId: string) => {
    setLinks((prev) =>
      prev.map((l) =>
        l.id === linkId ? { ...l, status: l.status === 'up' ? 'down' : 'up' } : l
      )
    );
  };

  // Update Link Weight
  const handleUpdateLinkWeight = (linkId: string, weight: number) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === linkId ? { ...l, weight } : l))
    );
  };

  // Update Link Packet Loss %
  const handleUpdateLinkLoss = (linkId: string, lossPercent: number) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === linkId ? { ...l, packetLossPercent: lossPercent } : l))
    );
  };

  // Delete Link
  const handleDeleteLink = (linkId: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  };

  // Delete Node
  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setLinks((prev) => prev.filter((l) => l.source !== nodeId && l.target !== nodeId));
    if (selectedNodeId === nodeId && nodes.length > 1) {
      setSelectedNodeId(nodes.find((n) => n.id !== nodeId)?.id || '');
    }
  };

  // Add Link
  const handleAddLink = (
    source: string,
    target: string,
    weight: number,
    isDirectional: boolean
  ) => {
    const newId = `link-${Date.now()}`;
    const newLink: NetworkLink = {
      id: newId,
      source,
      target,
      weight,
      capacityGbps: 100,
      status: 'up',
      isDirectional,
    };
    setLinks((prev) => [...prev, newLink]);
  };

  // Add Node
  const handleAddNode = (name: string, role: RouterNode['role']) => {
    const newId = name.replace(/\s+/g, '-').toUpperCase();
    const newNode: RouterNode = {
      id: newId,
      name,
      ip: `10.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}.1`,
      x: 350 + Math.floor(Math.random() * 150) - 75,
      y: 250 + Math.floor(Math.random() * 150) - 75,
      status: 'up',
      asNumber: 64512,
      role,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);
  };

  // Import Topology
  const handleImportTopology = (newNodes: RouterNode[], newLinks: NetworkLink[]) => {
    setNodes(newNodes);
    setLinks(newLinks);
    setSelectedPresetId('custom');
    if (newNodes.length > 0) setSelectedNodeId(newNodes[0].id);
    setPackets([]);
    setHighlightedPath(undefined);
  };

  // Dispatch Packet
  const handleSendPacket = useCallback(
    (sourceId: string, destId: string, ttl: number = 16, payload: string = 'TCP_DATA') => {
      if (sourceId === destId) return;

      const colors = ['#38bdf8', '#34d399', '#f59e0b', '#ec4899', '#a855f7', '#06b6d4'];
      const packetColor = colors[Math.floor(Math.random() * colors.length)];

      const nextHop = getNextHopNodeId(sourceId, destId, nodes, links, activeRoutingEngine);
      const srcNode = nodes.find((n) => n.id === sourceId);
      const dstNode = nodes.find((n) => n.id === destId);

      const packetId = `pkt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newPacket: NetworkPacket = {
        id: packetId,
        sourceId,
        destId,
        currentHopId: sourceId,
        targetHopId: nextHop.nextHopId || sourceId,
        progress: 0,
        speed: 0.009, // base traversal fraction per tick
        visitedHops: [sourceId],
        ttl,
        maxTtl: ttl,
        status: nextHop.nextHopId ? 'in_transit' : 'dropped_unreachable',
        totalLatency: 0,
        payload,
        color: packetColor,
        createdAt: Date.now(),
        header: {
          version: 4,
          ihl: 5,
          tos: '0x00 (DSCP Normal)',
          totalLength: 40 + payload.length,
          identification: Math.floor(Math.random() * 65535),
          flags: '0x02 (DF)',
          ttl,
          protocol: payload.includes('ICMP') ? 'ICMP' : 'TCP',
          checksum: `0x${Math.floor(Math.random() * 65535).toString(16)}`,
          srcIp: srcNode?.ip || '10.0.0.1',
          destIp: dstNode?.ip || '10.0.0.2',
          srcMac: `52:54:00:${Math.floor(Math.random() * 90 + 10)}:${Math.floor(Math.random() * 90 + 10)}:01`,
          destMac: `52:54:00:${Math.floor(Math.random() * 90 + 10)}:${Math.floor(Math.random() * 90 + 10)}:02`,
        },
      };

      setPackets((prev) => [...prev.slice(-40), newPacket]); // limit buffer

      // Log event
      setPacketLogs((prev) => [
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          packetId,
          fromNode: sourceId,
          toNode: nextHop.nextHopId || 'NONE',
          eventType: nextHop.nextHopId ? 'spawn' : 'unreachable',
          message: nextHop.nextHopId
            ? `Injected #${packetId.slice(-4)} (${payload}) at ${sourceId} ➔ ${destId} via ${nextHop.nextHopId}`
            : `Packet #${packetId.slice(-4)} dropped: No route from ${sourceId} to ${destId}`,
          ttlRemaining: ttl,
          latencyAcc: 0,
        },
        ...prev.slice(0, 100),
      ]);
    },
    [nodes, links, activeRoutingEngine]
  );

  // Send Burst of Packets
  const handleSendBurst = (sourceId: string, destId: string, count: number = 5) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        handleSendPacket(sourceId, destId, 16, `STREAM_CHUNK_${i + 1}`);
      }, i * 300);
    }
  };

  // Run Traceroute Probes
  const handleRunTraceroute = (sourceId: string, destId: string) => {
    const lookup = getNextHopNodeId(sourceId, destId, nodes, links, activeRoutingEngine);
    if (lookup.path.length >= 2) {
      setHighlightedPath(lookup.path);
    }
    handleSendPacket(sourceId, destId, 24, 'ICMP_TRACEROUTE_PROBE');
  };

  // Continuous Traffic Generator Effect
  useEffect(() => {
    let interval: any;
    if (isTrafficGenActive && !isSimPaused) {
      interval = setInterval(() => {
        const activeNodes = nodes.filter((n) => n.status === 'up');
        if (activeNodes.length >= 2) {
          const srcIdx = Math.floor(Math.random() * activeNodes.length);
          let dstIdx = Math.floor(Math.random() * activeNodes.length);
          while (dstIdx === srcIdx) {
            dstIdx = Math.floor(Math.random() * activeNodes.length);
          }
          const payloads = [
            'HTTP/2 GET /index.html',
            'DNS Query: api.cloud.internal',
            'TLS ClientHello',
            'BGP KEEPALIVE',
            'QUIC Initial Packet',
          ];
          const payload = payloads[Math.floor(Math.random() * payloads.length)];
          handleSendPacket(activeNodes[srcIdx].id, activeNodes[dstIdx].id, 16, payload);
        }
      }, 1000 / trafficRate);
    }
    return () => clearInterval(interval);
  }, [isTrafficGenActive, isSimPaused, trafficRate, nodes, handleSendPacket]);

  // Live Packet Forwarding Loop (requestAnimationFrame)
  useEffect(() => {
    const updatePackets = (timestamp: number) => {
      const dt = Math.min(timestamp - lastTimeRef.current, 100);
      lastTimeRef.current = timestamp;

      if (!isSimPaused) {
        setPackets((prevPackets) => {
          let hasChanges = false;
          const updated = prevPackets.map((pkt) => {
            if (pkt.status !== 'in_transit') return pkt;

            hasChanges = true;
            const newProgress = pkt.progress + pkt.speed * (dt / 16.6) * simSpeed;

            if (newProgress < 1.0) {
              return { ...pkt, progress: newProgress };
            }

            // Packet reached targetHopId!
            const arrivedNodeId = pkt.targetHopId;
            const newVisited = [...pkt.visitedHops, arrivedNodeId];

            // Reached destination!
            if (arrivedNodeId === pkt.destId) {
              setPacketLogs((prev) => [
                {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString(),
                  packetId: pkt.id,
                  fromNode: pkt.currentHopId,
                  toNode: arrivedNodeId,
                  eventType: 'delivered',
                  message: `Packet #${pkt.id.slice(-4)} DELIVERED to ${arrivedNodeId}! (Latency: ${pkt.totalLatency}ms, TTL: ${pkt.ttl})`,
                  ttlRemaining: pkt.ttl,
                  latencyAcc: pkt.totalLatency,
                },
                ...prev.slice(0, 100),
              ]);
              return {
                ...pkt,
                progress: 1.0,
                status: 'delivered' as const,
                visitedHops: newVisited,
              };
            }

            // TTL decrement
            const nextTtl = pkt.ttl - 1;
            if (nextTtl <= 0) {
              setPacketLogs((prev) => [
                {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString(),
                  packetId: pkt.id,
                  fromNode: pkt.currentHopId,
                  toNode: arrivedNodeId,
                  eventType: 'dropped_ttl',
                  message: `Packet #${pkt.id.slice(-4)} DROPPED at ${arrivedNodeId}: ICMP Time Exceeded (TTL=0)`,
                  ttlRemaining: 0,
                  latencyAcc: pkt.totalLatency,
                },
                ...prev.slice(0, 100),
              ]);
              return {
                ...pkt,
                progress: 1.0,
                ttl: 0,
                status: 'dropped_ttl' as const,
                visitedHops: newVisited,
              };
            }

            // Detect repeated visits to same node (routing loop!)
            const visitCount = newVisited.filter((h) => h === arrivedNodeId).length;
            if (visitCount >= 3) {
              setPacketLogs((prev) => [
                {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString(),
                  packetId: pkt.id,
                  fromNode: pkt.currentHopId,
                  toNode: arrivedNodeId,
                  eventType: 'dropped_loop',
                  message: `Packet #${pkt.id.slice(-4)} DROPPED at ${arrivedNodeId}: Routing Loop detected! Node visited ${visitCount} times!`,
                  ttlRemaining: nextTtl,
                  latencyAcc: pkt.totalLatency,
                },
                ...prev.slice(0, 100),
              ]);
              return {
                ...pkt,
                progress: 1.0,
                ttl: nextTtl,
                status: 'dropped_loop' as const,
                visitedHops: newVisited,
              };
            }

            // Look up next hop from arrivedNodeId
            const lookup = getNextHopNodeId(arrivedNodeId, pkt.destId, nodes, links, activeRoutingEngine);
            if (!lookup.nextHopId) {
              setPacketLogs((prev) => [
                {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString(),
                  packetId: pkt.id,
                  fromNode: arrivedNodeId,
                  toNode: 'NONE',
                  eventType: 'unreachable',
                  message: `Packet #${pkt.id.slice(-4)} DROPPED at ${arrivedNodeId}: Destination ${pkt.destId} unreachable (Null0 route).`,
                  ttlRemaining: nextTtl,
                  latencyAcc: pkt.totalLatency,
                },
                ...prev.slice(0, 100),
              ]);
              return {
                ...pkt,
                progress: 1.0,
                ttl: nextTtl,
                status: 'dropped_unreachable' as const,
                visitedHops: newVisited,
              };
            }

            // Find link metric & check packet loss
            const activeLink = links.find(
              (l) =>
                (l.source === arrivedNodeId && l.target === lookup.nextHopId) ||
                (!l.isDirectional && l.source === lookup.nextHopId && l.target === arrivedNodeId)
            );

            if (activeLink?.packetLossPercent && Math.random() * 100 < activeLink.packetLossPercent) {
              setPacketLogs((prev) => [
                {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString(),
                  packetId: pkt.id,
                  fromNode: arrivedNodeId,
                  toNode: lookup.nextHopId!,
                  eventType: 'dropped_loss',
                  message: `Packet #${pkt.id.slice(-4)} DROPPED: Random link packet loss on ${arrivedNodeId} ➔ ${lookup.nextHopId} (${activeLink.packetLossPercent}%)`,
                  ttlRemaining: nextTtl,
                  latencyAcc: pkt.totalLatency,
                },
                ...prev.slice(0, 100),
              ]);
              return {
                ...pkt,
                progress: 1.0,
                ttl: nextTtl,
                status: 'dropped_packet_loss' as const,
                visitedHops: newVisited,
              };
            }

            const hopLatency = activeLink ? activeLink.weight : 10;

            // Continue forwarding
            return {
              ...pkt,
              currentHopId: arrivedNodeId,
              targetHopId: lookup.nextHopId,
              progress: 0,
              ttl: nextTtl,
              totalLatency: pkt.totalLatency + hopLatency,
              visitedHops: newVisited,
            };
          });

          return hasChanges ? updated : prevPackets;
        });
      }

      animRef.current = requestAnimationFrame(updatePackets);
    };

    animRef.current = requestAnimationFrame(updatePackets);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSimPaused, simSpeed, nodes, links, activeRoutingEngine]);

  const activePreset = PRESET_TOPOLOGIES.find((p) => p.id === selectedPresetId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Application Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/20">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white font-mono">
                  Network Packet Router Simulator
                </h1>
                <span className="text-[10px] bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-bold px-1.5 py-0.5 rounded shadow">
                  Cisco · Juniper · AWS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Bellman-Ford DV · Negative Cycles · Floyd-Warshall Matrix · Live Packet Forwarding
              </p>
            </div>
          </div>

          {/* Preset Topologies Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs font-mono">
            <span className="text-slate-500 px-2 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              Preset:
            </span>
            {PRESET_TOPOLOGIES.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleLoadPreset(preset.id)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  selectedPresetId === preset.id
                    ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-900/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={preset.description}
              >
                <span>{preset.name.split(' ')[0]}</span>
                {preset.id === 'negative-cycle' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                )}
              </button>
            ))}

            <button
              onClick={() => setIsTopologyModalOpen(true)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer flex items-center gap-1"
              title="Export or Import JSON Graph Topology"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>JSON</span>
            </button>
          </div>

          {/* Global Simulation Controls */}
          <div className="flex items-center gap-2 font-mono text-xs">
            {/* Active Routing Engine Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px]">
              <button
                onClick={() => setActiveRoutingEngine('Bellman-Ford')}
                className={`px-2.5 py-1 rounded cursor-pointer transition font-bold ${
                  activeRoutingEngine === 'Bellman-Ford'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Active forwarding uses Bellman-Ford Distance Vector"
              >
                Bellman-Ford
              </button>
              <button
                onClick={() => setActiveRoutingEngine('Floyd-Warshall')}
                className={`px-2.5 py-1 rounded cursor-pointer transition font-bold ${
                  activeRoutingEngine === 'Floyd-Warshall'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Active forwarding uses Floyd-Warshall All-Pairs"
              >
                Floyd-Warshall
              </button>
            </div>

            <button
              onClick={() => setIsSimPaused(!isSimPaused)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer border ${
                isSimPaused
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-900/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {isSimPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isSimPaused ? 'Resume' : 'Pause'}</span>
            </button>

            {/* Sim Speed Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  className={`px-2 py-1 rounded text-[11px] cursor-pointer transition ${
                    simSpeed === spd
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              onClick={() => handleLoadPreset(selectedPresetId)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
              title="Reset Topology to Default"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Preset Banner Summary */}
      {activePreset && (
        <div className="bg-slate-900/60 border-b border-slate-800/60 px-4 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                {activePreset.badge}
              </span>
              <span className="text-slate-300 font-semibold">{activePreset.name}:</span>
              <span className="text-slate-400 hidden sm:inline">{activePreset.description}</span>
            </div>
            <div className="flex items-center gap-3">
              {highlightedPath && (
                <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded font-mono text-[11px]">
                  <span>Active Trace:</span>
                  <strong>{highlightedPath.join(' ➔ ')}</strong>
                  <button
                    onClick={() => setHighlightedPath(undefined)}
                    className="ml-1 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="text-[11px] text-amber-300 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{activePreset.algorithmNote}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <nav className="border-b border-slate-800 bg-slate-950 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'canvas'
                ? 'border-sky-500 text-sky-400 bg-sky-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Interactive Network Topology & Packets</span>
          </button>

          <button
            onClick={() => setActiveTab('bellman-ford')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'bellman-ford'
                ? 'border-sky-500 text-sky-400 bg-sky-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Bellman-Ford DV & Negative Cycles</span>
            {negativeCycleInfo.hasNegativeCycle && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('floyd-warshall')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'floyd-warshall'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Grid className="w-4 h-4 text-cyan-400" />
            <span>Floyd-Warshall Adjacency Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('routing-tables')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'routing-tables'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Router Forwarding Tables (FIB)</span>
          </button>

          <button
            onClick={() => setActiveTab('cli')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'cli'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Router Interactive CLI</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'code'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span>C++ & Java Source Code</span>
          </button>
        </div>
      </nav>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* TAB 1: Visual Canvas & Packet Simulation */}
        {activeTab === 'canvas' && (
          <div className="space-y-6">
            <NetworkCanvas
              nodes={nodes}
              links={links}
              packets={packets}
              selectedNodeId={selectedNodeId}
              highlightedPath={highlightedPath}
              onSelectNode={setSelectedNodeId}
              onSelectPacket={(p) => setInspectingPacket(p)}
              onUpdateNodePosition={handleUpdateNodePosition}
              onToggleNodeStatus={handleToggleNodeStatus}
              onToggleLinkStatus={handleToggleLinkStatus}
              onUpdateLinkWeight={handleUpdateLinkWeight}
              onUpdateLinkLoss={handleUpdateLinkLoss}
              onDeleteLink={handleDeleteLink}
              onDeleteNode={handleDeleteNode}
              onAddLink={handleAddLink}
              onAddNode={handleAddNode}
              onQuickSendPacket={(src, dst) => handleSendPacket(src, dst, 16, 'QUICK_PROBE')}
              negativeCycleEdges={negativeCycleInfo.edges}
              negativeCycleNodes={negativeCycleInfo.nodes}
            />

            {/* Packet Inspector and Telemetry feed */}
            <PacketInspector
              nodes={nodes}
              packets={packets}
              logs={packetLogs}
              isTrafficGenActive={isTrafficGenActive}
              trafficRate={trafficRate}
              stats={telemetryStats}
              onToggleTrafficGen={() => setIsTrafficGenActive(!isTrafficGenActive)}
              onChangeTrafficRate={setTrafficRate}
              onSendPacket={handleSendPacket}
              onSendBurst={handleSendBurst}
              onClearLogs={() => {
                setPackets([]);
                setPacketLogs([]);
              }}
              onRunTraceroute={handleRunTraceroute}
              onSelectPacketById={(pktId) => {
                const found = packets.find((p) => p.id === pktId);
                if (found) setInspectingPacket(found);
              }}
            />
          </div>
        )}

        {/* TAB 2: Bellman-Ford Visualizer */}
        {activeTab === 'bellman-ford' && (
          <BellmanFordViewer
            nodes={nodes}
            links={links}
            sourceId={selectedNodeId}
            onChangeSourceId={setSelectedNodeId}
            onHighlightPath={(path) => {
              setHighlightedPath(path);
              setActiveTab('canvas');
            }}
          />
        )}

        {/* TAB 3: Floyd-Warshall Adjacency Matrix */}
        {activeTab === 'floyd-warshall' && (
          <FloydWarshallViewer
            nodes={nodes}
            links={links}
            onHighlightPath={(path) => {
              setHighlightedPath(path);
              setActiveTab('canvas');
            }}
          />
        )}

        {/* TAB 4: Router Routing Tables */}
        {activeTab === 'routing-tables' && (
          <RoutingTableViewer
            nodes={nodes}
            links={links}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onHighlightPath={(path) => {
              setHighlightedPath(path);
              setActiveTab('canvas');
            }}
          />
        )}

        {/* TAB 5: Interactive Router CLI Terminal */}
        {activeTab === 'cli' && (
          <CliTerminal
            nodes={nodes}
            links={links}
            onLoadPreset={handleLoadPreset}
            onSendPacket={handleSendPacket}
            onUpdateLinkWeight={handleUpdateLinkWeight}
            onToggleLinkStatus={handleToggleLinkStatus}
          />
        )}

        {/* TAB 6: C++ and Java Reference Code */}
        {activeTab === 'code' && <ReferenceCodeViewer />}
      </main>

      {/* Packet Wireshark / Header Inspection Modal */}
      {inspectingPacket && (
        <PacketHeaderModal
          packet={inspectingPacket}
          onClose={() => setInspectingPacket(null)}
        />
      )}

      {/* Topology JSON Manager Modal */}
      <TopologyManagerModal
        nodes={nodes}
        links={links}
        isOpen={isTopologyModalOpen}
        onClose={() => setIsTopologyModalOpen(false)}
        onImport={handleImportTopology}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-4 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Simulated Router Network Active · RFC 1058 (RIP) · RFC 2328 (OSPF)</span>
          </div>
          <div>
            Routing Engine: <strong className="text-sky-400">{activeRoutingEngine}</strong> · Throughput:{' '}
            <strong className="text-cyan-400">{telemetryStats.throughputMbps.toFixed(1)} Mbps</strong> · Avg Latency:{' '}
            <strong className="text-emerald-400">{telemetryStats.avgLatencyMs} ms</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}
