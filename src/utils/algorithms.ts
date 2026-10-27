/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RouterNode,
  NetworkLink,
  BellmanFordResult,
  BellmanFordStep,
  FloydWarshallResult,
  FloydWarshallStep,
  RoutingTableEntry,
} from '../types/network';

export interface DirectedEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  originalLink: NetworkLink;
}

/**
 * Extracts active directed edges from network links, handling both directed
 * and bidirectional links.
 */
export function getActiveEdges(nodes: RouterNode[], links: NetworkLink[]): DirectedEdge[] {
  const activeNodeIds = new Set(nodes.filter((n) => n.status === 'up').map((n) => n.id));
  const edges: DirectedEdge[] = [];

  for (const link of links) {
    if (link.status !== 'up') continue;
    if (!activeNodeIds.has(link.source) || !activeNodeIds.has(link.target)) continue;

    edges.push({
      id: `${link.id}-fwd`,
      source: link.source,
      target: link.target,
      weight: link.weight,
      originalLink: link,
    });

    // If bidirectional, also add reverse edge
    if (!link.isDirectional) {
      edges.push({
        id: `${link.id}-rev`,
        source: link.target,
        target: link.source,
        weight: link.weight,
        originalLink: link,
      });
    }
  }

  return edges;
}

/**
 * Bellman-Ford Single-Source Shortest Path Algorithm
 * with step-by-step recording and negative cycle detection & path tracing.
 */
export function runBellmanFord(
  nodes: RouterNode[],
  links: NetworkLink[],
  sourceId: string
): BellmanFordResult {
  const activeNodes = nodes.filter((n) => n.status === 'up');
  const edges = getActiveEdges(nodes, links);
  const V = activeNodes.length;

  const distances: Record<string, number> = {};
  const predecessors: Record<string, string | null> = {};

  for (const node of activeNodes) {
    distances[node.id] = node.id === sourceId ? 0 : Infinity;
    predecessors[node.id] = null;
  }

  const steps: BellmanFordStep[] = [];

  // Step 0: Initial State
  steps.push({
    iteration: 0,
    distances: { ...distances },
    predecessors: { ...predecessors },
    updatedEdges: [],
    logMessage: `Initialized Bellman-Ford with source router ${sourceId}. Distances set to 0 for ${sourceId}, ∞ for others.`,
  });

  if (V <= 1) {
    return {
      sourceId,
      distances,
      predecessors,
      steps,
      hasNegativeCycle: false,
      negativeCyclePath: [],
      negativeCycleEdges: [],
      totalIterations: 1,
    };
  }

  // Relax edges |V| - 1 times
  let convergedEarly = false;
  let iterationsRun = 0;

  for (let i = 1; i <= V - 1; i++) {
    iterationsRun = i;
    const updatedEdges: BellmanFordStep['updatedEdges'] = [];
    let anyUpdate = false;

    for (const edge of edges) {
      const u = edge.source;
      const v = edge.target;
      const w = edge.weight;

      if (distances[u] !== Infinity && distances[u] + w < distances[v]) {
        const oldDist = distances[v];
        const newDist = distances[u] + w;
        distances[v] = newDist;
        predecessors[v] = u;
        anyUpdate = true;
        updatedEdges.push({
          u,
          v,
          weight: w,
          oldDist,
          newDist,
        });
      }
    }

    steps.push({
      iteration: i,
      distances: { ...distances },
      predecessors: { ...predecessors },
      updatedEdges,
      logMessage: anyUpdate
        ? `Round ${i}/${V - 1}: Relaxed ${updatedEdges.length} link(s) to optimize routes.`
        : `Round ${i}/${V - 1}: Routing table converged. No further distance reductions possible.`,
    });

    if (!anyUpdate) {
      convergedEarly = true;
      break;
    }
  }

  // Step V: Negative cycle detection
  let hasNegativeCycle = false;
  let cycleStartNode: string | null = null;
  const cycleEdges: string[] = [];

  for (const edge of edges) {
    const u = edge.source;
    const v = edge.target;
    const w = edge.weight;

    if (distances[u] !== Infinity && distances[u] + w < distances[v]) {
      hasNegativeCycle = true;
      cycleStartNode = v;
      break;
    }
  }

  const negativeCyclePath: string[] = [];
  if (hasNegativeCycle && cycleStartNode) {
    // To find the vertices in the negative cycle, follow predecessors V times
    // to guarantee we are inside the cycle loop
    let curr: string | null = cycleStartNode;
    for (let i = 0; i < V; i++) {
      if (curr && predecessors[curr]) {
        curr = predecessors[curr];
      }
    }

    // Now collect the cycle
    const cycleNodes: string[] = [];
    const visited = new Set<string>();
    let tracer = curr;

    while (tracer && !visited.has(tracer)) {
      visited.add(tracer);
      cycleNodes.push(tracer);
      tracer = predecessors[tracer];
    }

    if (tracer) {
      cycleNodes.push(tracer); // Close the cycle loop
      cycleNodes.reverse();

      // Find the slice that forms the actual closed cycle
      const firstIndex = cycleNodes.indexOf(cycleNodes[cycleNodes.length - 1]);
      const validCycle = cycleNodes.slice(firstIndex);
      negativeCyclePath.push(...validCycle);

      // Find edge IDs participating in this negative cycle
      for (let idx = 0; idx < validCycle.length - 1; idx++) {
        const uNode = validCycle[idx];
        const vNode = validCycle[idx + 1];
        const matchingLink = links.find(
          (l) =>
            l.status === 'up' &&
            ((l.source === uNode && l.target === vNode) ||
              (!l.isDirectional && l.source === vNode && l.target === uNode))
        );
        if (matchingLink) {
          cycleEdges.push(matchingLink.id);
        }
      }
    }

    steps.push({
      iteration: iterationsRun + 1,
      distances: { ...distances },
      predecessors: { ...predecessors },
      updatedEdges: [],
      logMessage: `CRITICAL ALERT: Negative cycle / routing loop detected! Path: ${negativeCyclePath.join(' → ')}. Metric decreases unboundedly!`,
    });
  }

  return {
    sourceId,
    distances,
    predecessors,
    steps,
    hasNegativeCycle,
    negativeCyclePath,
    negativeCycleEdges: Array.from(new Set(cycleEdges)),
    totalIterations: steps.length - 1,
  };
}

/**
 * Floyd-Warshall All-Pairs Shortest Path Algorithm
 * Uses dynamic programming adjacency matrix and tracks next-hop reconstruction.
 */
export function runFloydWarshall(
  nodes: RouterNode[],
  links: NetworkLink[]
): FloydWarshallResult {
  const activeNodes = nodes.filter((n) => n.status === 'up');
  const nodeIds = activeNodes.map((n) => n.id);
  const n = nodeIds.length;
  const nodeIndexMap = new Map<string, number>();
  nodeIds.forEach((id, idx) => nodeIndexMap.set(id, idx));

  // Initialize Distance matrix and Next-Hop matrix
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const nextHop: (string | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 0;
    nextHop[i][i] = nodeIds[i];
  }

  // Populate direct edges
  for (const link of links) {
    if (link.status !== 'up') continue;
    const uIdx = nodeIndexMap.get(link.source);
    const vIdx = nodeIndexMap.get(link.target);

    if (uIdx !== undefined && vIdx !== undefined) {
      if (link.weight < matrix[uIdx][vIdx]) {
        matrix[uIdx][vIdx] = link.weight;
        nextHop[uIdx][vIdx] = nodeIds[vIdx];
      }

      if (!link.isDirectional) {
        if (link.weight < matrix[vIdx][uIdx]) {
          matrix[vIdx][uIdx] = link.weight;
          nextHop[vIdx][uIdx] = nodeIds[uIdx];
        }
      }
    }
  }

  const steps: FloydWarshallStep[] = [];

  // Step 0 snapshot (direct adjacency matrix)
  steps.push({
    k: -1,
    kNodeId: 'Direct Adjacency',
    matrix: matrix.map((row) => [...row]),
    nextHop: nextHop.map((row) => [...row]),
    updates: [],
  });

  // Floyd-Warshall Triply Nested Loop
  for (let k = 0; k < n; k++) {
    const kNodeId = nodeIds[k];
    const updates: FloydWarshallStep['updates'] = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix[i][k] !== Infinity && matrix[k][j] !== Infinity) {
          const viaK = matrix[i][k] + matrix[k][j];
          if (viaK < matrix[i][j]) {
            updates.push({
              i,
              j,
              oldVal: matrix[i][j],
              newVal: viaK,
              viaK,
            });
            matrix[i][j] = viaK;
            // The next hop from i to j becomes the next hop from i to k
            nextHop[i][j] = nextHop[i][k];
          }
        }
      }
    }

    steps.push({
      k,
      kNodeId,
      matrix: matrix.map((row) => [...row]),
      nextHop: nextHop.map((row) => [...row]),
      updates,
    });
  }

  // Check for negative cycles (diagonal elements < 0)
  const negativeCycleNodes: string[] = [];
  let hasNegativeCycle = false;

  for (let i = 0; i < n; i++) {
    if (matrix[i][i] < 0) {
      hasNegativeCycle = true;
      negativeCycleNodes.push(nodeIds[i]);
    }
  }

  return {
    nodeIds,
    matrix,
    nextHop,
    steps,
    hasNegativeCycle,
    negativeCycleNodes,
  };
}

/**
 * Reconstructs shortest path from source to dest using Floyd-Warshall next-hop matrix.
 */
export function reconstructPathFloyd(
  sourceId: string,
  destId: string,
  nodeIds: string[],
  nextHop: (string | null)[][],
  matrix: number[][]
): { path: string[]; cost: number } {
  const uIdx = nodeIds.indexOf(sourceId);
  const vIdx = nodeIds.indexOf(destId);

  if (uIdx === -1 || vIdx === -1 || matrix[uIdx][vIdx] === Infinity) {
    return { path: [], cost: Infinity };
  }

  if (sourceId === destId) {
    return { path: [sourceId], cost: 0 };
  }

  const path: string[] = [sourceId];
  let curr = sourceId;
  const visited = new Set<string>([sourceId]);

  while (curr !== destId) {
    const cIdx = nodeIds.indexOf(curr);
    const nxt = nextHop[cIdx][vIdx];
    if (!nxt || visited.has(nxt)) {
      // Loop or broken path
      if (nxt && visited.has(nxt)) {
        path.push(nxt); // shows loop
      }
      break;
    }
    path.push(nxt);
    visited.add(nxt);
    curr = nxt;
  }

  return { path, cost: matrix[uIdx][vIdx] };
}

/**
 * Reconstructs path from Bellman-Ford predecessors map.
 */
export function reconstructPathBellman(
  sourceId: string,
  destId: string,
  predecessors: Record<string, string | null>,
  distances: Record<string, number>
): { path: string[]; cost: number } {
  if (distances[destId] === undefined || distances[destId] === Infinity) {
    return { path: [], cost: Infinity };
  }

  if (sourceId === destId) {
    return { path: [sourceId], cost: 0 };
  }

  const path: string[] = [];
  let curr: string | null = destId;
  const visited = new Set<string>();

  while (curr !== null) {
    if (visited.has(curr)) {
      path.unshift(curr);
      break;
    }
    visited.add(curr);
    path.unshift(curr);
    if (curr === sourceId) break;
    curr = predecessors[curr] ?? null;
  }

  if (path[0] !== sourceId) {
    return { path: [], cost: Infinity };
  }

  return { path, cost: distances[destId] };
}

/**
 * Generates comprehensive routing table for a given router.
 */
export function generateRoutingTable(
  nodeId: string,
  nodes: RouterNode[],
  links: NetworkLink[],
  protocol: 'Bellman-Ford' | 'Floyd-Warshall' = 'Bellman-Ford'
): RoutingTableEntry[] {
  const activeNodes = nodes.filter((n) => n.status === 'up');
  const thisNode = activeNodes.find((n) => n.id === nodeId);
  if (!thisNode) return [];

  const table: RoutingTableEntry[] = [];

  if (protocol === 'Bellman-Ford') {
    const bfResult = runBellmanFord(nodes, links, nodeId);

    for (const targetNode of activeNodes) {
      if (targetNode.id === nodeId) {
        // Connected to self
        table.push({
          destinationId: targetNode.id,
          destinationIp: targetNode.ip,
          destinationName: targetNode.name,
          nextHopId: 'Local Loopback',
          nextHopIp: '127.0.0.1',
          metric: 0,
          hopCount: 0,
          interfaceName: 'lo0',
          protocol: 'Direct',
          status: 'valid',
          path: [nodeId],
        });
        continue;
      }

      const { path, cost } = reconstructPathBellman(
        nodeId,
        targetNode.id,
        bfResult.predecessors,
        bfResult.distances
      );

      if (cost === Infinity || path.length < 2) {
        table.push({
          destinationId: targetNode.id,
          destinationIp: targetNode.ip,
          destinationName: targetNode.name,
          nextHopId: null,
          nextHopIp: 'Unreachable',
          metric: Infinity,
          hopCount: 0,
          interfaceName: 'Null0',
          protocol: 'Bellman-Ford',
          status: 'unreachable',
          path: [],
        });
        continue;
      }

      const nextHopId = path[1];
      const nextHopNode = activeNodes.find((n) => n.id === nextHopId);
      const isLoop = bfResult.hasNegativeCycle && bfResult.negativeCyclePath.includes(targetNode.id);

      table.push({
        destinationId: targetNode.id,
        destinationIp: targetNode.ip,
        destinationName: targetNode.name,
        nextHopId,
        nextHopIp: nextHopNode?.ip ?? '0.0.0.0',
        metric: cost,
        hopCount: path.length - 1,
        interfaceName: `eth${targetNode.id.charCodeAt(0) % 4}`,
        protocol: 'Bellman-Ford',
        status: isLoop ? 'loop' : 'valid',
        path,
      });
    }
  } else {
    // Floyd-Warshall
    const fwResult = runFloydWarshall(nodes, links);
    for (const targetNode of activeNodes) {
      if (targetNode.id === nodeId) {
        table.push({
          destinationId: targetNode.id,
          destinationIp: targetNode.ip,
          destinationName: targetNode.name,
          nextHopId: 'Local Loopback',
          nextHopIp: '127.0.0.1',
          metric: 0,
          hopCount: 0,
          interfaceName: 'lo0',
          protocol: 'Direct',
          status: 'valid',
          path: [nodeId],
        });
        continue;
      }

      const { path, cost } = reconstructPathFloyd(
        nodeId,
        targetNode.id,
        fwResult.nodeIds,
        fwResult.nextHop,
        fwResult.matrix
      );

      if (cost === Infinity || path.length < 2) {
        table.push({
          destinationId: targetNode.id,
          destinationIp: targetNode.ip,
          destinationName: targetNode.name,
          nextHopId: null,
          nextHopIp: 'Unreachable',
          metric: Infinity,
          hopCount: 0,
          interfaceName: 'Null0',
          protocol: 'Floyd-Warshall',
          status: 'unreachable',
          path: [],
        });
        continue;
      }

      const nextHopId = path[1];
      const nextHopNode = activeNodes.find((n) => n.id === nextHopId);

      table.push({
        destinationId: targetNode.id,
        destinationIp: targetNode.ip,
        destinationName: targetNode.name,
        nextHopId,
        nextHopIp: nextHopNode?.ip ?? '0.0.0.0',
        metric: cost,
        hopCount: path.length - 1,
        interfaceName: `eth${targetNode.id.charCodeAt(0) % 4}`,
        protocol: 'Floyd-Warshall',
        status: 'valid',
        path,
      });
    }
  }

  // Sort by destination id
  return table.sort((a, b) => a.destinationId.localeCompare(b.destinationId));
}

/**
 * Determines the next router to forward a packet to based on current node and destination.
 */
export function getNextHopNodeId(
  currentId: string,
  destId: string,
  nodes: RouterNode[],
  links: NetworkLink[],
  protocol: 'Bellman-Ford' | 'Floyd-Warshall' = 'Bellman-Ford'
): { nextHopId: string | null; cost: number; isLoop: boolean; path: string[] } {
  if (currentId === destId) {
    return { nextHopId: null, cost: 0, isLoop: false, path: [currentId] };
  }

  if (protocol === 'Bellman-Ford') {
    const bf = runBellmanFord(nodes, links, currentId);
    const { path, cost } = reconstructPathBellman(currentId, destId, bf.predecessors, bf.distances);
    return {
      nextHopId: path.length > 1 ? path[1] : null,
      cost,
      isLoop: bf.hasNegativeCycle,
      path,
    };
  } else {
    const fw = runFloydWarshall(nodes, links);
    const { path, cost } = reconstructPathFloyd(currentId, destId, fw.nodeIds, fw.nextHop, fw.matrix);
    return {
      nextHopId: path.length > 1 ? path[1] : null,
      cost,
      isLoop: fw.hasNegativeCycle,
      path,
    };
  }
}
