/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RouterNode, NetworkPacket, PacketLogEntry } from '../types/network';
import {
  Send,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Trash2,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface PacketInspectorProps {
  nodes: RouterNode[];
  packets: NetworkPacket[];
  logs: PacketLogEntry[];
  isTrafficGenActive: boolean;
  trafficRate: number;
  stats: {
    throughputMbps: number;
    packetLossRate: number;
    avgLatencyMs: number;
  };
  onToggleTrafficGen: () => void;
  onChangeTrafficRate: (rate: number) => void;
  onSendPacket: (sourceId: string, destId: string, ttl: number, payload: string) => void;
  onSendBurst: (sourceId: string, destId: string, count: number) => void;
  onClearLogs: () => void;
  onRunTraceroute: (sourceId: string, destId: string) => void;
  onSelectPacketById: (packetId: string) => void;
}

export const PacketInspector: React.FC<PacketInspectorProps> = ({
  nodes,
  packets,
  logs,
  isTrafficGenActive,
  trafficRate,
  stats,
  onToggleTrafficGen,
  onChangeTrafficRate,
  onSendPacket,
  onSendBurst,
  onClearLogs,
  onRunTraceroute,
  onSelectPacketById,
}) => {
  const activeNodes = nodes.filter((n) => n.status === 'up');

  const [sourceId, setSourceId] = useState<string>(activeNodes[0]?.id || '');
  const [destId, setDestId] = useState<string>(activeNodes[1]?.id || activeNodes[0]?.id || '');
  const [ttl, setTtl] = useState<number>(16);
  const [payload, setPayload] = useState<string>('GET /api/v1/network-status HTTP/2');

  // Stats
  const deliveredCount = packets.filter((p) => p.status === 'delivered').length;
  const droppedTtlCount = packets.filter((p) => p.status === 'dropped_ttl').length;
  const droppedLoopCount = packets.filter((p) => p.status === 'dropped_loop').length;
  const inFlightCount = packets.filter((p) => p.status === 'in_transit').length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 text-slate-200 shadow-xl">
      {/* Header and Packet Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-100 font-mono tracking-tight">
              Packet Forwarding Simulator & Telemetry
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Inject discrete packets into the network topology and observe hop-by-hop forwarding,
            TTL decrement, latency accumulation, and loop drop behaviors.
          </p>
        </div>

        {/* Live Counters & Throughput Telemetry */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Traffic Generator Toggle */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 rounded-lg">
            <button
              onClick={onToggleTrafficGen}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                isTrafficGenActive
                  ? 'bg-emerald-600 text-white animate-pulse'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isTrafficGenActive ? 'Traffic Gen: ON' : 'Traffic Gen: OFF'}</span>
            </button>
            {isTrafficGenActive && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span>{trafficRate}/s</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={trafficRate}
                  onChange={(e) => onChangeTrafficRate(Number(e.target.value))}
                  className="w-14 accent-emerald-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-400">Throughput:</span>
            <strong className="text-cyan-300">{stats.throughputMbps.toFixed(1)} Mbps</strong>
          </div>

          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-slate-400">In Transit:</span>
            <strong className="text-sky-300">{inFlightCount}</strong>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Delivered:</span>
            <strong className="text-emerald-300">{deliveredCount}</strong>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-slate-400">Dropped:</span>
            <strong className="text-red-400">{droppedTtlCount + droppedLoopCount}</strong>
          </div>
        </div>
      </div>

      {/* Packet Transmission Form */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <label className="text-slate-400 block mb-1">Source Ingress Router:</label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sky-400 font-mono text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {activeNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Destination Egress Router:</label>
            <select
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-400 font-mono text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {activeNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Time-To-Live (TTL):</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={64}
                value={ttl}
                onChange={(e) => setTtl(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500">hops</span>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Payload / Protocol Header:</label>
            <input
              type="text"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              placeholder="e.g. TCP_SYN, DNS_REQ"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSendPacket(sourceId, destId, ttl, payload)}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold font-mono cursor-pointer transition shadow-md shadow-sky-900/40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Single Packet</span>
            </button>

            <button
              onClick={() => onSendBurst(sourceId, destId, 5)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold font-mono cursor-pointer transition border border-slate-700"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Send Burst (5 Packets)</span>
            </button>

            <button
              onClick={() => onRunTraceroute(sourceId, destId)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold font-mono cursor-pointer transition border border-slate-700"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Run Traceroute</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            *In loop topologies, packets will recirculate until TTL reaches 0.
          </div>
        </div>
      </div>

      {/* Packet Transmission Telemetry Log */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Router Event & Telemetry Log (Click row to inspect packet header)
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                let csv = 'Timestamp,PacketID,From,To,Event,Message,TTL,Latency\n';
                for (const log of logs) {
                  csv += `"${log.timestamp}","${log.packetId}","${log.fromNode}","${log.toNode}","${log.eventType}","${log.message.replace(/"/g, '""')}","${log.ttlRemaining}","${log.latencyAcc}"\n`;
                }
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `packet-telemetry-${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              disabled={logs.length === 0}
              className="text-[11px] text-sky-400 hover:text-sky-300 disabled:opacity-40 transition cursor-pointer font-mono"
            >
              Export CSV
            </button>
            <button
              onClick={onClearLogs}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition cursor-pointer font-mono"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Logs</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-slate-600">
              No packet events recorded yet. Send a packet above to observe live forwarding events!
            </div>
          ) : (
            <div className="divide-y divide-slate-850">
              {logs.map((log) => {
                let badge = 'bg-sky-950 text-sky-400 border-sky-800';
                let icon = <Send className="w-3 h-3 text-sky-400" />;

                if (log.eventType === 'delivered') {
                  badge = 'bg-emerald-950 text-emerald-400 border-emerald-800';
                  icon = <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
                } else if (log.eventType === 'dropped_loop' || log.eventType === 'dropped_ttl') {
                  badge = 'bg-red-950 text-red-400 border-red-800';
                  icon = <AlertTriangle className="w-3 h-3 text-red-400" />;
                } else if (log.eventType === 'unreachable') {
                  badge = 'bg-amber-950 text-amber-400 border-amber-800';
                  icon = <XCircle className="w-3 h-3 text-amber-400" />;
                }

                return (
                  <div
                    key={log.id}
                    onClick={() => onSelectPacketById(log.packetId)}
                    className="p-2.5 flex items-start gap-3 hover:bg-slate-900/80 cursor-pointer transition group"
                    title="Click to inspect deep packet header & frame"
                  >
                    <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">
                      {log.timestamp}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] border flex items-center gap-1 shrink-0 ${badge}`}
                    >
                      {icon}
                      {log.eventType.toUpperCase()}
                    </span>
                    <span className="text-slate-300 flex-1">{log.message}</span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      TTL: {log.ttlRemaining} | {log.latencyAcc}ms
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
