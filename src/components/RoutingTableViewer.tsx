/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RouterNode, NetworkLink } from '../types/network';
import { generateRoutingTable } from '../utils/algorithms';
import {
  FileText,
  Copy,
  Check,
  Server,
  Layers,
  ArrowRight,
  AlertTriangle,
  Download,
} from 'lucide-react';

interface RoutingTableViewerProps {
  nodes: RouterNode[];
  links: NetworkLink[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onHighlightPath?: (path: string[]) => void;
}

export const RoutingTableViewer: React.FC<RoutingTableViewerProps> = ({
  nodes,
  links,
  selectedNodeId,
  onSelectNode,
  onHighlightPath,
}) => {
  const [protocol, setProtocol] = useState<'Bellman-Ford' | 'Floyd-Warshall'>('Bellman-Ford');
  const [copied, setCopied] = useState(false);

  const activeNodes = nodes.filter((n) => n.status === 'up');
  const currentNode = activeNodes.find((n) => n.id === selectedNodeId) || activeNodes[0];

  const tableEntries = React.useMemo(() => {
    if (!currentNode) return [];
    return generateRoutingTable(currentNode.id, nodes, links, protocol);
  }, [currentNode, nodes, links, protocol]);

  // Generate authentic Cisco IOS style text output
  const generateCiscoOutput = () => {
    if (!currentNode) return '';
    const dateStr = new Date().toISOString();
    let out = `Codes: C - connected, S - static, R - RIP (Bellman-Ford), O - OSPF (Link-State)\n`;
    out += `Gateway of last resort is not set\n\n`;
    out += `Router# show ip route\n`;
    out += `Hostname: ${currentNode.name} (${currentNode.id}) [AS${currentNode.asNumber}]\n`;
    out += `Protocol Active: ${protocol}\n`;
    out += `------------------------------------------------------------------------------------\n`;
    out += `Proto  Destination Subnet    Next Hop IP      Metric   Hops  Out Interface\n`;
    out += `------------------------------------------------------------------------------------\n`;

    for (const entry of tableEntries) {
      const code = entry.protocol === 'Direct' ? 'C' : entry.protocol === 'Bellman-Ford' ? 'R' : 'O';
      const subnet = `${entry.destinationIp}/32`.padEnd(20);
      const gw = (entry.nextHopId ? entry.nextHopIp : 'Unreachable').padEnd(16);
      const metric = entry.metric === Infinity ? 'INF' : `${entry.metric}ms`;
      out += `${code.padEnd(6)} ${subnet} ${gw} ${metric.padEnd(8)} ${entry.hopCount.toString().padEnd(5)} ${entry.interfaceName}\n`;
    }
    return out;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCiscoOutput());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentNode) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        No active routers available.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 text-slate-200 shadow-xl">
      {/* Header and Router Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-slate-100 font-mono tracking-tight">
              Forwarding Information Base (FIB) / Routing Table
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Router: <span className="text-sky-300 font-bold">{currentNode.name} ({currentNode.id})</span> | IP:{' '}
            <span className="text-amber-400">{currentNode.ip}</span> | AS:{' '}
            <span className="text-purple-400">AS{currentNode.asNumber}</span>
          </p>
        </div>

        {/* Algorithm switch & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs font-mono">
            <button
              onClick={() => setProtocol('Bellman-Ford')}
              className={`px-3 py-1 rounded cursor-pointer transition ${
                protocol === 'Bellman-Ford'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bellman-Ford (DV)
            </button>
            <button
              onClick={() => setProtocol('Floyd-Warshall')}
              className={`px-3 py-1 rounded cursor-pointer transition ${
                protocol === 'Floyd-Warshall'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Floyd-Warshall (All-Pairs)
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg transition border border-slate-700 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Cisco CLI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Router Node Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <span className="text-slate-500 mr-1">Switch Router:</span>
        {activeNodes.map((n) => (
          <button
            key={n.id}
            onClick={() => onSelectNode(n.id)}
            className={`px-3 py-1.5 rounded-lg border transition whitespace-nowrap cursor-pointer ${
              n.id === currentNode.id
                ? 'bg-sky-950 text-sky-300 border-sky-500 font-bold shadow-md'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            {n.id} ({n.name})
          </button>
        ))}
      </div>

      {/* Routing Table Display */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Destination Subnet</th>
              <th className="px-4 py-3">Target Router</th>
              <th className="px-4 py-3">Next-Hop Gateway</th>
              <th className="px-4 py-3">Metric (Latency)</th>
              <th className="px-4 py-3">Hop Count</th>
              <th className="px-4 py-3">Out Interface</th>
              <th className="px-4 py-3">Calculated Path</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/60">
            {tableEntries.map((entry) => {
              const isDirect = entry.protocol === 'Direct';
              const isUnreachable = entry.status === 'unreachable';
              const isLoop = entry.status === 'loop';

              return (
                <tr
                  key={entry.destinationId}
                  onClick={() => entry.path.length >= 2 && onHighlightPath?.(entry.path)}
                  className={`hover:bg-slate-800/60 cursor-pointer transition-colors ${
                    isLoop ? 'bg-red-950/40 font-semibold' : ''
                  }`}
                  title="Click to highlight this route on the topology canvas"
                >
                  <td className="px-4 py-3">
                    {isDirect ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950 text-sky-400 border border-sky-800">
                        {entry.protocol === 'Bellman-Ford' ? 'RIP (DV)' : 'OSPF (FW)'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-100 font-bold">
                    {entry.destinationIp}/32
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {entry.destinationName} ({entry.destinationId})
                  </td>
                  <td className="px-4 py-3">
                    {isUnreachable ? (
                      <span className="text-red-400 font-bold">Unreachable</span>
                    ) : (
                      <span className="text-amber-400">
                        {entry.nextHopIp}{' '}
                        {entry.nextHopId && entry.nextHopId !== 'Local Loopback' && (
                          <span className="text-slate-500">via {entry.nextHopId}</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isUnreachable ? (
                      <span className="text-slate-600">∞</span>
                    ) : (
                      <span
                        className={`font-bold ${
                          entry.metric < 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {entry.metric} ms
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {isUnreachable ? '—' : entry.hopCount}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-bold">
                    {entry.interfaceName}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {entry.path.length > 0 ? (
                      <span className="text-slate-300">
                        {entry.path.join(' ➔ ')}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cisco Terminal Preview Drawer */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 text-sky-400">
            <FileText className="w-3.5 h-3.5" />
            Cisco IOS / Juniper CLI Format (Ready for MNC lab exams):
          </span>
          <span className="text-[10px] text-slate-500">Auto-generated from graph state</span>
        </div>
        <pre className="bg-slate-900/90 text-emerald-400 p-3 rounded font-mono text-[11px] overflow-x-auto border border-slate-800 leading-tight">
          {generateCiscoOutput()}
        </pre>
      </div>
    </div>
  );
};
