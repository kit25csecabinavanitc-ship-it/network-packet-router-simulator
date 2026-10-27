/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { RouterNode, NetworkLink } from '../types/network';
import {
  runBellmanFord,
  runFloydWarshall,
  generateRoutingTable,
  reconstructPathBellman,
  reconstructPathFloyd,
} from '../utils/algorithms';
import { Terminal, Send, HelpCircle, Trash2 } from 'lucide-react';

interface CliTerminalProps {
  nodes: RouterNode[];
  links: NetworkLink[];
  onLoadPreset: (presetId: string) => void;
  onSendPacket: (sourceId: string, destId: string, ttl: number, payload: string) => void;
  onUpdateLinkWeight: (linkId: string, weight: number) => void;
  onToggleLinkStatus: (linkId: string) => void;
}

interface CommandLog {
  id: string;
  command: string;
  output: string | React.ReactNode;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

export const CliTerminal: React.FC<CliTerminalProps> = ({
  nodes,
  links,
  onLoadPreset,
  onSendPacket,
  onUpdateLinkWeight,
  onToggleLinkStatus,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [logs, setLogs] = useState<CommandLog[]>([
    {
      id: 'init-1',
      command: 'system-init',
      output: (
        <div>
          <p className="text-cyan-400 font-bold">
            Cisco / Juniper / AWS CLI Network Router Simulator v3.4.1
          </p>
          <p className="text-slate-400">
            Type <span className="text-amber-400 font-bold">help</span> to list available commands.
            Try <span className="text-sky-300">ping SFO NYC</span>,{' '}
            <span className="text-sky-300">traceroute Branch VPC-App</span>, or{' '}
            <span className="text-sky-300">detect-loop</span>.
          </p>
        </div>
      ),
      type: 'info',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCommand = (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    // Add to history
    setHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);

    const parts = cmd.split(/\s+/);
    const primary = parts[0].toLowerCase();
    const args = parts.slice(1);
    const timestamp = new Date().toLocaleTimeString();

    if (primary === 'clear') {
      setLogs([]);
      setInputVal('');
      return;
    }

    if (primary === 'help') {
      const output = (
        <div className="space-y-1 text-slate-300">
          <p className="text-amber-300 font-bold">Available Router CLI Commands:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-sky-400 font-bold">ping &lt;src&gt; &lt;dest&gt;</span>
              <p className="text-slate-400 text-[11px]">Send ICMP packet & measure RTT</p>
            </div>
            <div>
              <span className="text-sky-400 font-bold">traceroute &lt;src&gt; &lt;dest&gt;</span>
              <p className="text-slate-400 text-[11px]">Trace hop-by-hop router path & latency</p>
            </div>
            <div>
              <span className="text-sky-400 font-bold">show ip route [node]</span>
              <p className="text-slate-400 text-[11px]">Print router forwarding table</p>
            </div>
            <div>
              <span className="text-sky-400 font-bold">bellman-ford &lt;src&gt;</span>
              <p className="text-slate-400 text-[11px]">Run Distance Vector routing & step report</p>
            </div>
            <div>
              <span className="text-sky-400 font-bold">floyd-warshall</span>
              <p className="text-slate-400 text-[11px]">Calculate all-pairs adjacency matrix</p>
            </div>
            <div>
              <span className="text-sky-400 font-bold">detect-loop</span>
              <p className="text-slate-400 text-[11px]">Check for negative cycles & routing loops</p>
            </div>
            <div>
              <span className="text-sky-400 font-bold">load-topology &lt;preset&gt;</span>
              <p className="text-slate-400 text-[11px]">as-backbone | negative-cycle | enterprise-sdwan | leaf-spine</p>
            </div>
            <div>
              <span className="text-sky-400 font-bold">link-toggle &lt;linkId&gt;</span>
              <p className="text-slate-400 text-[11px]">Simulate fiber cut or restore link</p>
            </div>
            <div>
              <span className="text-sky-400 font-bold">set-weight &lt;src&gt; &lt;dst&gt; &lt;ms&gt;</span>
              <p className="text-slate-400 text-[11px]">Modify link latency metric</p>
            </div>
            <div>
              <span className="text-sky-400 font-bold">clear</span>
              <p className="text-slate-400 text-[11px]">Clear terminal screen</p>
            </div>
          </div>
        </div>
      );
      setLogs((prev) => [...prev, { id: Math.random().toString(), command: cmd, output, type: 'info', timestamp }]);
      setInputVal('');
      return;
    }

    if (primary === 'ping') {
      if (args.length < 2) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            command: cmd,
            output: 'Usage: ping <sourceRouter> <destRouter> (e.g. ping SFO NYC)',
            type: 'error',
            timestamp,
          },
        ]);
        setInputVal('');
        return;
      }
      const [src, dst] = args;
      const srcNode = nodes.find((n) => n.id.toLowerCase() === src.toLowerCase());
      const dstNode = nodes.find((n) => n.id.toLowerCase() === dst.toLowerCase());

      if (!srcNode || !dstNode) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            command: cmd,
            output: `Unknown router node: ${!srcNode ? src : dst}. Valid nodes: ${nodes.map((n) => n.id).join(', ')}`,
            type: 'error',
            timestamp,
          },
        ]);
        setInputVal('');
        return;
      }

      onSendPacket(srcNode.id, dstNode.id, 16, 'ICMP_ECHO_REQUEST');
      const bf = runBellmanFord(nodes, links, srcNode.id);
      const { path, cost } = reconstructPathBellman(srcNode.id, dstNode.id, bf.predecessors, bf.distances);

      let outputNode;
      if (bf.hasNegativeCycle) {
        outputNode = (
          <div className="text-red-400">
            <p>PING {dstNode.ip} ({dstNode.id}) from {srcNode.ip}: 56 data bytes</p>
            <p className="font-bold">⚠️ CRITICAL: Destination trapped in negative routing loop: {bf.negativeCyclePath.join(' ➔ ')}!</p>
            <p>Packet will drop with ICMP Time Exceeded (TTL expired).</p>
          </div>
        );
      } else if (cost === Infinity || path.length < 2) {
        outputNode = (
          <div className="text-red-400">
            <p>PING {dstNode.ip}: Destination Host Unreachable.</p>
          </div>
        );
      } else {
        outputNode = (
          <div className="text-emerald-400">
            <p>PING {dstNode.ip} ({dstNode.name}) from {srcNode.ip}: 56 data bytes</p>
            <p>64 bytes from {dstNode.ip}: icmp_seq=1 ttl=15 time={cost} ms</p>
            <p>64 bytes from {dstNode.ip}: icmp_seq=2 ttl=15 time={cost} ms</p>
            <p className="text-slate-400 text-[11px] mt-1">
              Path: <span className="text-sky-300 font-bold">{path.join(' ➔ ')}</span> | Latency RTT: {cost * 2} ms
            </p>
          </div>
        );
      }

      setLogs((prev) => [...prev, { id: Math.random().toString(), command: cmd, output: outputNode, type: 'success', timestamp }]);
      setInputVal('');
      return;
    }

    if (primary === 'traceroute') {
      if (args.length < 2) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            command: cmd,
            output: 'Usage: traceroute <sourceRouter> <destRouter> (e.g. traceroute SFO NYC)',
            type: 'error',
            timestamp,
          },
        ]);
        setInputVal('');
        return;
      }
      const [src, dst] = args;
      const srcNode = nodes.find((n) => n.id.toLowerCase() === src.toLowerCase());
      const dstNode = nodes.find((n) => n.id.toLowerCase() === dst.toLowerCase());

      if (!srcNode || !dstNode) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            command: cmd,
            output: `Unknown router node: ${!srcNode ? src : dst}`,
            type: 'error',
            timestamp,
          },
        ]);
        setInputVal('');
        return;
      }

      const bf = runBellmanFord(nodes, links, srcNode.id);
      const { path, cost } = reconstructPathBellman(srcNode.id, dstNode.id, bf.predecessors, bf.distances);

      if (bf.hasNegativeCycle) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            command: cmd,
            output: (
              <div className="text-red-400">
                <p>traceroute to {dstNode.name} ({dstNode.ip}), 30 hops max</p>
                <p className="font-bold">⚠️ TRACEROUTE ABORTED: Routing Loop Detected along {bf.negativeCyclePath.join(' ➔ ')}</p>
              </div>
            ),
            type: 'warning',
            timestamp,
          },
        ]);
        setInputVal('');
        return;
      }

      const rows: string[] = [];
      let cumulative = 0;
      for (let i = 0; i < path.length; i++) {
        const node = nodes.find((n) => n.id === path[i]);
        if (i > 0) {
          const prevNode = path[i - 1];
          const currNode = path[i];
          const link = links.find(
            (l) =>
              (l.source === prevNode && l.target === currNode) ||
              (!l.isDirectional && l.source === currNode && l.target === prevNode)
          );
          cumulative += link ? link.weight : 5;
        }
        rows.push(`${i + 1}  ${node?.name ?? path[i]} (${node?.ip ?? '0.0.0.0'})  ${cumulative} ms`);
      }

      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          command: cmd,
          output: (
            <div className="text-sky-300">
              <p>traceroute to {dstNode.name} ({dstNode.ip}), 30 hops max, 60 byte packets</p>
              {rows.map((r, idx) => (
                <p key={idx} className="font-mono">{r}</p>
              ))}
              <p className="text-emerald-400 font-bold mt-1">Hop count: {path.length - 1} | Total Transit Latency: {cost} ms</p>
            </div>
          ),
          type: 'success',
          timestamp,
        },
      ]);
      setInputVal('');
      return;
    }

    if (primary === 'detect-loop') {
      const activeNodes = nodes.filter((n) => n.status === 'up');
      let loopFound = false;
      let loopDetails: any = null;

      for (const node of activeNodes) {
        const bf = runBellmanFord(nodes, links, node.id);
        if (bf.hasNegativeCycle) {
          loopFound = true;
          loopDetails = bf;
          break;
        }
      }

      if (loopFound) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            command: cmd,
            output: (
              <div className="text-red-400 space-y-1">
                <p className="font-bold">⚠️ CRITICAL: NEGATIVE WEIGHT CYCLE / ROUTING LOOP DETECTED!</p>
                <p>Loop Cycle Nodes: {loopDetails.negativeCyclePath.join(' ➔ ')}</p>
                <p className="text-xs text-slate-400">
                  Total metric continues to decrease infinitely on each relaxation pass. Distance vector routing table cannot stabilize.
                </p>
              </div>
            ),
            type: 'error',
            timestamp,
          },
        ]);
      } else {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            command: cmd,
            output: (
              <div className="text-emerald-400">
                <p className="font-bold">✓ NETWORK INTEGRITY VERIFIED: NO ROUTING LOOPS OR NEGATIVE CYCLES</p>
                <p className="text-xs text-slate-300">All paths converge to strictly finite optimal shortest routes.</p>
              </div>
            ),
            type: 'success',
            timestamp,
          },
        ]);
      }
      setInputVal('');
      return;
    }

    if (primary === 'floyd-warshall') {
      const fw = runFloydWarshall(nodes, links);
      const outMatrix = (
        <div className="text-xs font-mono space-y-2">
          <p className="text-cyan-400 font-bold">Floyd-Warshall All-Pairs Distance Matrix D[V][V]:</p>
          <div className="overflow-x-auto">
            <table className="border-collapse border border-slate-700">
              <thead>
                <tr>
                  <th className="p-1 border border-slate-700 text-slate-500">Node</th>
                  {fw.nodeIds.map((id) => (
                    <th key={id} className="p-1 border border-slate-700 text-sky-400 min-w-[40px] text-center">
                      {id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fw.nodeIds.map((rowId, i) => (
                  <tr key={rowId}>
                    <td className="p-1 border border-slate-700 text-sky-400 font-bold">{rowId}</td>
                    {fw.nodeIds.map((colId, j) => {
                      const val = fw.matrix[i][j];
                      return (
                        <td
                          key={colId}
                          className={`p-1 border border-slate-700 text-center ${
                            val === Infinity ? 'text-slate-600' : val < 0 ? 'text-red-400 font-bold' : 'text-emerald-400'
                          }`}
                        >
                          {val === Infinity ? 'INF' : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

      setLogs((prev) => [...prev, { id: Math.random().toString(), command: cmd, output: outMatrix, type: 'info', timestamp }]);
      setInputVal('');
      return;
    }

    if (primary === 'bellman-ford') {
      const src = args[0] || nodes[0]?.id;
      const srcNode = nodes.find((n) => n.id.toLowerCase() === src.toLowerCase());
      if (!srcNode) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            command: cmd,
            output: `Unknown source router: ${src}`,
            type: 'error',
            timestamp,
          },
        ]);
        setInputVal('');
        return;
      }

      const bf = runBellmanFord(nodes, links, srcNode.id);
      const outNode = (
        <div className="text-xs font-mono space-y-1">
          <p className="text-sky-400 font-bold">Bellman-Ford Distance Vector from {srcNode.name} ({srcNode.id}):</p>
          <p className="text-slate-400">Total Relaxation Rounds: {bf.steps.length - 1}</p>
          {bf.hasNegativeCycle && (
            <p className="text-red-400 font-bold">Loop Alert: {bf.negativeCyclePath.join(' ➔ ')}</p>
          )}
          <div className="space-y-0.5">
            {Object.entries(bf.distances).map(([id, dist]) => (
              <p key={id}>
                {id.padEnd(8)}: {dist === Infinity ? '∞ (Unreachable)' : `${dist} ms`} (Predecessor: {bf.predecessors[id] ?? 'None'})
              </p>
            ))}
          </div>
        </div>
      );

      setLogs((prev) => [...prev, { id: Math.random().toString(), command: cmd, output: outNode, type: 'info', timestamp }]);
      setInputVal('');
      return;
    }

    if (primary === 'load-topology') {
      const target = args[0];
      if (!target) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            command: cmd,
            output: 'Usage: load-topology <as-backbone | negative-cycle | enterprise-sdwan | leaf-spine>',
            type: 'error',
            timestamp,
          },
        ]);
        setInputVal('');
        return;
      }
      onLoadPreset(target);
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          command: cmd,
          output: `Loaded topology preset: ${target}`,
          type: 'success',
          timestamp,
        },
      ]);
      setInputVal('');
      return;
    }

    // Default unrecognized
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        command: cmd,
        output: `Command not found: "${cmd}". Type "help" to view all available commands.`,
        type: 'error',
        timestamp,
      },
    ]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx >= history.length) {
          setHistoryIndex(-1);
          setInputVal('');
        } else {
          setHistoryIndex(nextIdx);
          setInputVal(history[nextIdx]);
        }
      }
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-2xl flex flex-col h-[520px]">
      {/* Terminal Title Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-slate-300">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200">Router Interactive CLI Console</span>
          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded">
            CONNECTED (pts/0)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLogs([])}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 cursor-pointer"
            title="Clear Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950">
        {logs.map((log) => (
          <div key={log.id} className="space-y-1">
            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <span className="text-emerald-400 font-bold">admin@core-router#</span>
              <span className="text-slate-200">{log.command}</span>
              <span className="ml-auto text-[10px] text-slate-600">{log.timestamp}</span>
            </div>
            <div className="pl-4 text-slate-300 border-l border-slate-800/80">
              {log.output}
            </div>
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Command Input Bar */}
      <div className="bg-slate-900/80 border-t border-slate-800 p-2.5 flex items-center gap-2">
        <span className="text-emerald-400 font-bold pl-2">router&gt;</span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type command (e.g., ping SFO NYC, traceroute Branch TGW, help)..."
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none text-xs font-mono"
          autoFocus
        />
        <button
          onClick={() => handleCommand(inputVal)}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
        >
          <span>Run</span>
          <Send className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
