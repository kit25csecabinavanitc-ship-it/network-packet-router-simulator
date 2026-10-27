/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RouterNode, NetworkLink } from '../types/network';
import { runBellmanFord } from '../utils/algorithms';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface BellmanFordViewerProps {
  nodes: RouterNode[];
  links: NetworkLink[];
  sourceId: string;
  onChangeSourceId: (newSource: string) => void;
  onHighlightPath?: (path: string[]) => void;
}

export const BellmanFordViewer: React.FC<BellmanFordViewerProps> = ({
  nodes,
  links,
  sourceId,
  onChangeSourceId,
  onHighlightPath,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1500); // ms per step

  // Compute Bellman-Ford
  const result = React.useMemo(() => {
    return runBellmanFord(nodes, links, sourceId);
  }, [nodes, links, sourceId]);

  // Reset step when topology or source changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [nodes, links, sourceId]);

  // Auto-play timer
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= result.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, result.steps.length, playbackSpeed]);

  const currentStep = result.steps[currentStepIndex] || result.steps[0];
  const activeNodes = nodes.filter((n) => n.status === 'up');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 text-slate-200 shadow-xl">
      {/* Header & Source Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-100 font-mono tracking-tight">
              Bellman-Ford Distance Vector Stepper
            </h2>
            <span className="text-xs font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded">
              O(V · E) Complexity
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulates distributed Distance Vector routing protocols (e.g., RIP / IGRP) by relaxing
            all network links iteratively.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-mono">Source Router:</label>
          <select
            value={sourceId}
            onChange={(e) => onChangeSourceId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-sky-400 font-mono text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {activeNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.id}) - {n.ip}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stepper Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(0);
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition cursor-pointer"
            title="Reset to Iteration 0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded transition cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Auto Play</span>
              </>
            )}
          </button>

          <button
            disabled={currentStepIndex >= result.steps.length - 1}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex((prev) => Math.min(result.steps.length - 1, prev + 1));
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded transition cursor-pointer"
          >
            <span>Next Step</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-mono text-slate-400 ml-2">
            Step{' '}
            <strong className="text-sky-400">
              {currentStep.iteration}
            </strong>{' '}
            of {result.steps.length - 1}
          </span>
        </div>

        {/* Speed slider */}
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Speed:</span>
          <button
            onClick={() => setPlaybackSpeed(2000)}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              playbackSpeed === 2000 ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            0.5x
          </button>
          <button
            onClick={() => setPlaybackSpeed(1200)}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              playbackSpeed === 1200 ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            1x
          </button>
          <button
            onClick={() => setPlaybackSpeed(500)}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              playbackSpeed === 500 ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            2x
          </button>
        </div>
      </div>

      {/* Step Log Alert */}
      <div
        className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
          result.hasNegativeCycle && currentStepIndex === result.steps.length - 1
            ? 'bg-red-950/60 border-red-500/80 text-red-200'
            : currentStep.updatedEdges.length > 0
            ? 'bg-sky-950/40 border-sky-800/80 text-sky-200'
            : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
        }`}
      >
        {result.hasNegativeCycle && currentStepIndex === result.steps.length - 1 ? (
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        ) : currentStep.updatedEdges.length > 0 ? (
          <Zap className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        )}
        <span>{currentStep.logMessage}</span>
      </div>

      {/* Negative Cycle Diagnostic Banner */}
      {result.hasNegativeCycle && (
        <div className="bg-red-950/70 border border-red-600/70 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-red-300 font-bold font-mono text-sm">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span>CRITICAL: Negative Weight Cycle / Routing Loop Detected!</span>
          </div>
          <p className="text-xs text-red-200 leading-relaxed">
            On relaxation iteration |V| = {activeNodes.length}, distance metrics continued to decrease.
            A closed directed cycle exists with negative cumulative metric. Packets routed here will
            experience the classic <strong>Count-to-Infinity problem</strong> and circulate infinitely
            until TTL drops to zero!
          </p>
          <div className="flex items-center gap-2 bg-slate-950/80 border border-red-900/60 p-2.5 rounded-lg text-xs font-mono text-red-300">
            <strong className="text-slate-400">Trapped Loop Path:</strong>
            <span className="text-amber-300 font-bold">
              {result.negativeCyclePath.join(' ➔ ')}
            </span>
          </div>
        </div>
      )}

      {/* Distance Vector Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Distance Vector State at Round {currentStep.iteration}
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5">Destination Node</th>
                <th className="px-3 py-2.5">IP Address</th>
                <th className="px-3 py-2.5">Predecessor (π)</th>
                <th className="px-3 py-2.5">Shortest Metric d[v]</th>
                <th className="px-3 py-2.5">Hop Path from {sourceId}</th>
                <th className="px-3 py-2.5">Round Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50">
              {activeNodes.map((node) => {
                const dist = currentStep.distances[node.id];
                const pred = currentStep.predecessors[node.id];
                const wasUpdated = currentStep.updatedEdges.some((e) => e.v === node.id);

                // Backtrace path
                const pathHops: string[] = [];
                let tracer: string | null = node.id;
                const visited = new Set<string>();
                while (tracer !== null && !visited.has(tracer)) {
                  visited.add(tracer);
                  pathHops.unshift(tracer);
                  if (tracer === sourceId) break;
                  tracer = currentStep.predecessors[tracer] ?? null;
                }

                return (
                  <tr
                    key={node.id}
                    onClick={() => pathHops.length >= 2 && onHighlightPath?.(pathHops)}
                    className={`transition-colors cursor-pointer ${
                      wasUpdated ? 'bg-sky-950/50 font-semibold' : 'hover:bg-slate-800/40'
                    }`}
                    title="Click to highlight this route on the network canvas"
                  >
                    <td className="px-3 py-2.5 text-slate-100 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      {node.name} ({node.id})
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{node.ip}</td>
                    <td className="px-3 py-2.5 text-amber-300">
                      {node.id === sourceId ? '— (Root)' : pred ?? 'None'}
                    </td>
                    <td className="px-3 py-2.5">
                      {dist === Infinity ? (
                        <span className="text-slate-500 font-bold">∞</span>
                      ) : (
                        <span
                          className={`font-bold ${
                            dist < 0 ? 'text-red-400' : wasUpdated ? 'text-sky-300' : 'text-emerald-400'
                          }`}
                        >
                          {dist} ms
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {dist === Infinity ? (
                        <span className="text-slate-500">Unreachable</span>
                      ) : (
                        pathHops.join(' → ')
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {wasUpdated ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-sky-900 text-sky-200 border border-sky-700 animate-pulse">
                          Relaxed & Optimized
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Unchanged</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relaxation Breakdown for Current Step */}
      {currentStep.updatedEdges.length > 0 && (
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
          <h4 className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Detailed Edge Relaxation Calculations (Round {currentStep.iteration}):
          </h4>
          <div className="space-y-1">
            {currentStep.updatedEdges.map((e, idx) => (
              <div
                key={idx}
                className="text-xs font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between"
              >
                <span>
                  Link <strong className="text-sky-300">{e.u} ➔ {e.v}</strong> (Metric: {e.weight}ms):
                </span>
                <span className="text-amber-300">
                  d[{e.v}] updated from {e.oldDist === Infinity ? '∞' : `${e.oldDist}ms`} ➔{' '}
                  <strong className="text-emerald-400">{e.newDist}ms</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
