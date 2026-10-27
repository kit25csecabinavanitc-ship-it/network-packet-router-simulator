/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CPP_CODE, JAVA_CODE } from '../data/referenceCode';
import { Copy, Check, Code, BookOpen, Award, Cpu } from 'lucide-react';

export const ReferenceCodeViewer: React.FC = () => {
  const [lang, setLang] = useState<'cpp' | 'java'>('cpp');
  const [copied, setCopied] = useState(false);

  const activeCode = lang === 'cpp' ? CPP_CODE : JAVA_CODE;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 text-slate-200 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100 font-mono tracking-tight">
              Production C++ & Java Reference Implementations
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete, runnable CLI code implementations for Bellman-Ford, Floyd-Warshall Adjacency
            Matrix, Negative Cycle Detection, and Packet Routing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs font-mono">
            <button
              onClick={() => setLang('cpp')}
              className={`px-3 py-1 rounded cursor-pointer transition ${
                lang === 'cpp' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              C++ 17 / 20
            </button>
            <button
              onClick={() => setLang('java')}
              className={`px-3 py-1 rounded cursor-pointer transition ${
                lang === 'java' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Java 17+
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
                <span>Copy Source</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MNC Interview & Exam Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-1.5">
          <div className="flex items-center gap-2 text-sky-400 font-bold">
            <Cpu className="w-4 h-4" />
            <span>Bellman-Ford Algorithm</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Time: <strong>O(V · E)</strong> | Space: <strong>O(V)</strong>.
            Relaxes all edges V-1 times. On step V, any continuing distance reduction proves the
            existence of a negative cycle. Foundation of Distance Vector protocols (RIP, BGP path vector).
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <BookOpen className="w-4 h-4" />
            <span>Floyd-Warshall Algorithm</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Time: <strong>O(V³)</strong> | Space: <strong>O(V²)</strong> adjacency matrix.
            Triply nested loop over intermediate nodes k. Detects negative cycles if any diagonal
            element <code>dist[i][i] &lt; 0</code>. Ideal for dense transit ISP cores.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Award className="w-4 h-4" />
            <span>MNC Relevance</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Tested heavily at Cisco, Juniper Networks, Amazon AWS, and Arista for routing engine
            firmware, SD-WAN route reflection, and distributed consensus loops.
          </p>
        </div>
      </div>

      {/* Code Display */}
      <div className="relative rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
        <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 text-xs text-slate-400 font-mono flex items-center justify-between">
          <span>{lang === 'cpp' ? 'router_simulator.cpp' : 'NetworkPacketRouterSimulator.java'}</span>
          <span className="text-[11px] text-slate-500">Adjacency Matrix + Negative Cycle Detection</span>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed select-text">
          <code>{activeCode}</code>
        </pre>
      </div>
    </div>
  );
};
