/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RouterNode, NetworkLink } from '../types/network';
import { runFloydWarshall, reconstructPathFloyd } from '../utils/algorithms';
import {
  Grid,
  ArrowRight,
  Calculator,
  AlertTriangle,
  RotateCcw,
  SkipForward,
  Play,
  Layers,
  Info,
} from 'lucide-react';

interface FloydWarshallViewerProps {
  nodes: RouterNode[];
  links: NetworkLink[];
  onHighlightPath?: (path: string[]) => void;
}

export const FloydWarshallViewer: React.FC<FloydWarshallViewerProps> = ({
  nodes,
  links,
  onHighlightPath,
}) => {
  const fwResult = React.useMemo(() => {
    return runFloydWarshall(nodes, links);
  }, [nodes, links]);

  const [stepIndex, setStepIndex] = useState<number>(fwResult.steps.length - 1);
  const [viewMode, setViewMode] = useState<'distance' | 'nextHop'>('distance');
  const [selectedCell, setSelectedCell] = useState<{ i: number; j: number } | null>(null);

  // If stepIndex is out of range due to topology change, reset to final
  React.useEffect(() => {
    setStepIndex(fwResult.steps.length - 1);
    setSelectedCell(null);
  }, [fwResult.steps.length]);

  const currentStep = fwResult.steps[stepIndex] || fwResult.steps[0];
  const { nodeIds, matrix, nextHop } = fwResult;
  const n = nodeIds.length;

  // Selected cell path reconstruction
  const pathInfo = React.useMemo(() => {
    if (!selectedCell || selectedCell.i >= n || selectedCell.j >= n) return null;
    const srcId = nodeIds[selectedCell.i];
    const dstId = nodeIds[selectedCell.j];
    return reconstructPathFloyd(srcId, dstId, nodeIds, nextHop, matrix);
  }, [selectedCell, nodeIds, nextHop, matrix, n]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 text-slate-200 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-100 font-mono tracking-tight">
              Floyd-Warshall All-Pairs Adjacency Matrix
            </h2>
            <span className="text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
              O(V³) Complexity
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic programming algorithm computing shortest transit latency between every router
            pair by considering intermediate transit nodes k.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('distance')}
            className={`px-3 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
              viewMode === 'distance'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Distance Matrix D[i][j]
          </button>
          <button
            onClick={() => setViewMode('nextHop')}
            className={`px-3 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
              viewMode === 'nextHop'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Next-Hop Matrix π[i][j]
          </button>
        </div>
      </div>

      {/* Step slider & controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStepIndex(0)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition cursor-pointer"
            title="Step 0 (Direct Adjacency)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            disabled={stepIndex <= 0}
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded cursor-pointer"
          >
            Prev (k-1)
          </button>

          <button
            disabled={stepIndex >= fwResult.steps.length - 1}
            onClick={() => setStepIndex((prev) => Math.min(fwResult.steps.length - 1, prev + 1))}
            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded cursor-pointer"
          >
            Next (k+1)
          </button>

          <button
            onClick={() => setStepIndex(fwResult.steps.length - 1)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded cursor-pointer"
          >
            Final All-Pairs Matrix
          </button>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span>Intermediate Transit Node:</span>
          <span className="bg-slate-800 text-cyan-300 px-2.5 py-0.5 rounded border border-slate-700 font-bold">
            {stepIndex === 0 ? 'Direct Adjacency (k=0)' : `k = ${stepIndex - 1} (${currentStep.kNodeId})`}
          </span>
        </div>
      </div>

      {/* Negative Cycle Diagnostic Banner */}
      {fwResult.hasNegativeCycle && (
        <div className="bg-red-950/70 border border-red-600/70 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-300 font-bold font-mono text-sm">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span>Negative Diagonal Detected in Floyd-Warshall Matrix!</span>
          </div>
          <p className="text-xs text-red-200 leading-relaxed font-mono">
            Nodes with dist[i][i] &lt; 0:{' '}
            <strong className="text-amber-300">{fwResult.negativeCycleNodes.join(', ')}</strong>.
            This confirms a negative routing loop where a packet can return to the same router with a
            net negative latency metric!
          </p>
        </div>
      )}

      {/* Adjacency Matrix Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 p-4">
        <div className="min-w-fit">
          <table className="border-collapse text-xs font-mono mx-auto">
            <thead>
              <tr>
                <th className="p-2 text-slate-500 font-normal text-right">
                  From \ To
                </th>
                {nodeIds.map((colId, j) => (
                  <th
                    key={colId}
                    className={`p-2.5 text-center min-w-[70px] border-b border-slate-800 transition ${
                      selectedCell?.j === j ? 'text-amber-400 font-bold bg-amber-950/30' : 'text-slate-300'
                    }`}
                  >
                    {colId}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nodeIds.map((rowId, i) => (
                <tr key={rowId}>
                  <th
                    className={`p-2.5 text-right font-mono border-r border-slate-800 transition ${
                      selectedCell?.i === i ? 'text-amber-400 font-bold bg-amber-950/30' : 'text-slate-300'
                    }`}
                  >
                    {rowId}
                  </th>
                  {nodeIds.map((colId, j) => {
                    const isDiagonal = i === j;
                    const val = currentStep.matrix[i][j];
                    const nextNode = currentStep.nextHop[i][j];
                    const isSelected = selectedCell?.i === i && selectedCell?.j === j;
                    const isNegativeDiag = isDiagonal && val < 0;
                    const wasUpdatedInStep = currentStep.updates.some(
                      (u) => u.i === i && u.j === j
                    );

                    let cellBg = 'bg-slate-900/60';
                    let textColor = 'text-slate-300';

                    if (isNegativeDiag) {
                      cellBg = 'bg-red-950 text-red-300 border-red-500 font-bold animate-pulse';
                    } else if (isSelected) {
                      cellBg = 'bg-amber-950/70 border-amber-500 ring-2 ring-amber-400';
                      textColor = 'text-amber-200 font-bold';
                    } else if (wasUpdatedInStep) {
                      cellBg = 'bg-cyan-950/70 border-cyan-500';
                      textColor = 'text-cyan-300 font-bold';
                    } else if (isDiagonal) {
                      cellBg = 'bg-slate-800/40';
                      textColor = 'text-slate-400';
                    }

                    return (
                      <td
                        key={colId}
                        onClick={() => {
                          setSelectedCell({ i, j });
                          if (i !== j) {
                            const p = reconstructPathFloyd(rowId, colId, nodeIds, nextHop, matrix);
                            if (p.path.length >= 2) onHighlightPath?.(p.path);
                          }
                        }}
                        className={`p-2 text-center border border-slate-800/80 cursor-pointer transition hover:scale-105 ${cellBg}`}
                        title={`Click to inspect path ${rowId} ➔ ${colId}`}
                      >
                        {viewMode === 'distance' ? (
                          val === Infinity ? (
                            <span className="text-slate-600 font-bold">∞</span>
                          ) : (
                            <span className={textColor}>
                              {val}
                              <span className="text-[10px] text-slate-500 ml-0.5">ms</span>
                            </span>
                          )
                        ) : (
                          <span className={textColor}>
                            {nextNode ?? <span className="text-slate-600">—</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Cell Inspector & Formula Breakdown */}
      {selectedCell && pathInfo && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-amber-400 font-bold flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              Router Path Inspector: {nodeIds[selectedCell.i]} ➔ {nodeIds[selectedCell.j]}
            </h4>
            <span className="text-slate-400">
              Total Transit Cost:{' '}
              <strong className="text-emerald-400">
                {pathInfo.cost === Infinity ? 'Unreachable (∞)' : `${pathInfo.cost} ms`}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-slate-300">
            <span className="text-slate-400">Calculated Shortest Path:</span>
            {pathInfo.path.length > 0 ? (
              <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sky-300 font-bold">
                {pathInfo.path.join(' ➔ ')}
              </span>
            ) : (
              <span className="text-red-400">No path exists between routers</span>
            )}
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 text-slate-400 text-[11px] leading-relaxed">
            <strong className="text-cyan-300">Floyd-Warshall Dynamic Programming Recurrence:</strong>
            <p className="mt-1">
              D[i][j] = min( D[i][j], D[i][k] + D[k][j] )
            </p>
            <p className="text-slate-500 mt-0.5">
              Testing if routing traffic through intermediate router <em>k</em> ({currentStep.kNodeId}) yields lower latency than existing direct or alternate paths.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
