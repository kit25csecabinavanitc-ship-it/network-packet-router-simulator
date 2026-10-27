/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RouterRole = 'core' | 'edge' | 'gateway' | 'cloud';

export interface RouterNode {
  id: string;
  name: string;
  ip: string;
  x: number;
  y: number;
  status: 'up' | 'down';
  asNumber: number;
  role: RouterRole;
  queueSize?: number;
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  weight: number; // Latency in ms / Routing metric (can be negative for cycle simulation)
  capacityGbps: number;
  status: 'up' | 'down';
  isDirectional?: boolean; // false = bidirectional, true = directed source -> target
  packetLossPercent?: number; // 0 to 100% loss simulation
  currentLoadPackets?: number; // active packets in transit on this link
}

export type PacketStatus =
  | 'in_transit'
  | 'delivered'
  | 'dropped_ttl'
  | 'dropped_loop'
  | 'dropped_unreachable'
  | 'dropped_packet_loss';

export interface PacketHeader {
  version: number;
  ihl: number;
  tos: string;
  totalLength: number;
  identification: number;
  flags: string;
  ttl: number;
  protocol: 'ICMP' | 'TCP' | 'UDP';
  checksum: string;
  srcIp: string;
  destIp: string;
  srcMac: string;
  destMac: string;
}

export interface NetworkPacket {
  id: string;
  sourceId: string;
  destId: string;
  currentHopId: string;
  targetHopId: string;
  progress: number; // 0 to 1 along current link
  speed: number; // traversal step speed
  visitedHops: string[];
  ttl: number;
  maxTtl: number;
  status: PacketStatus;
  totalLatency: number;
  payload: string;
  color: string;
  createdAt: number;
  dropReason?: string;
  header?: PacketHeader;
}

export interface TrafficStats {
  totalPacketsSent: number;
  totalPacketsDelivered: number;
  totalPacketsDropped: number;
  throughputMbps: number;
  avgLatencyMs: number;
  packetLossRate: number;
}

export interface BellmanFordStep {
  iteration: number;
  distances: Record<string, number>;
  predecessors: Record<string, string | null>;
  updatedEdges: {
    u: string;
    v: string;
    weight: number;
    oldDist: number;
    newDist: number;
  }[];
  logMessage: string;
}

export interface BellmanFordResult {
  sourceId: string;
  distances: Record<string, number>;
  predecessors: Record<string, string | null>;
  steps: BellmanFordStep[];
  hasNegativeCycle: boolean;
  negativeCyclePath: string[]; // Node IDs in loop e.g. ['R2', 'R3', 'R4', 'R2']
  negativeCycleEdges: string[]; // Edge IDs in loop
  totalIterations: number;
}

export interface FloydWarshallStep {
  k: number;
  kNodeId: string;
  matrix: number[][];
  nextHop: (string | null)[][];
  updates: {
    i: number;
    j: number;
    oldVal: number;
    newVal: number;
    viaK: number;
  }[];
}

export interface FloydWarshallResult {
  nodeIds: string[];
  matrix: number[][];
  nextHop: (string | null)[][];
  steps: FloydWarshallStep[];
  hasNegativeCycle: boolean;
  negativeCycleNodes: string[];
}

export interface RoutingTableEntry {
  destinationId: string;
  destinationIp: string;
  destinationName: string;
  nextHopId: string | null;
  nextHopIp: string;
  metric: number;
  hopCount: number;
  interfaceName: string;
  protocol: 'Bellman-Ford' | 'Floyd-Warshall' | 'Direct';
  status: 'valid' | 'unreachable' | 'loop';
  path: string[];
}

export interface TracerouteHop {
  hopNumber: number;
  routerId: string;
  routerName: string;
  ip: string;
  latencyMs: number;
  cumulativeLatency: number;
  status: 'success' | 'timeout' | 'loop';
}

export interface PacketLogEntry {
  id: string;
  timestamp: string;
  packetId: string;
  fromNode: string;
  toNode: string;
  eventType: 'spawn' | 'forward' | 'delivered' | 'dropped_ttl' | 'dropped_loop' | 'unreachable' | 'dropped_loss';
  message: string;
  ttlRemaining: number;
  latencyAcc: number;
}
