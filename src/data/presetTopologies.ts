/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RouterNode, NetworkLink } from '../types/network';

export interface TopologyPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  algorithmNote: string;
  nodes: RouterNode[];
  links: NetworkLink[];
}

export const PRESET_TOPOLOGIES: TopologyPreset[] = [
  {
    id: 'as-backbone',
    name: 'Tier-1 ISP Autonomous System (AS64512)',
    badge: 'MNC Core Backbone',
    description:
      'Inter-regional core router mesh across North America. Illustrates Bellman-Ford and Floyd-Warshall finding optimal latency paths across continental distances.',
    algorithmNote:
      'Bellman-Ford converges in 4 iterations. Floyd-Warshall establishes the full 6x6 transit latency matrix across all metropolitan router hubs.',
    nodes: [
      { id: 'NYC', name: 'New York PoP', ip: '198.51.100.1', x: 740, y: 150, status: 'up', asNumber: 64512, role: 'core' },
      { id: 'CHI', name: 'Chicago Core', ip: '198.51.100.2', x: 500, y: 140, status: 'up', asNumber: 64512, role: 'core' },
      { id: 'ATL', name: 'Atlanta Transit', ip: '198.51.100.3', x: 620, y: 350, status: 'up', asNumber: 64512, role: 'gateway' },
      { id: 'DFW', name: 'Dallas Hub', ip: '198.51.100.4', x: 420, y: 360, status: 'up', asNumber: 64512, role: 'gateway' },
      { id: 'SFO', name: 'San Francisco Gateway', ip: '198.51.100.5', x: 140, y: 160, status: 'up', asNumber: 64512, role: 'edge' },
      { id: 'LAX', name: 'Los Angeles Edge', ip: '198.51.100.6', x: 180, y: 340, status: 'up', asNumber: 64512, role: 'edge' },
    ],
    links: [
      { id: 'l1', source: 'SFO', target: 'CHI', weight: 42, capacityGbps: 100, status: 'up', isDirectional: false },
      { id: 'l2', source: 'SFO', target: 'LAX', weight: 12, capacityGbps: 400, status: 'up', isDirectional: false },
      { id: 'l3', source: 'LAX', target: 'DFW', weight: 32, capacityGbps: 100, status: 'up', isDirectional: false },
      { id: 'l4', source: 'CHI', target: 'NYC', weight: 18, capacityGbps: 400, status: 'up', isDirectional: false },
      { id: 'l5', source: 'CHI', target: 'DFW', weight: 24, capacityGbps: 100, status: 'up', isDirectional: false },
      { id: 'l6', source: 'CHI', target: 'ATL', weight: 21, capacityGbps: 100, status: 'up', isDirectional: false },
      { id: 'l7', source: 'DFW', target: 'ATL', weight: 19, capacityGbps: 100, status: 'up', isDirectional: false },
      { id: 'l8', source: 'ATL', target: 'NYC', weight: 22, capacityGbps: 400, status: 'up', isDirectional: false },
    ],
  },
  {
    id: 'negative-cycle',
    name: 'Negative Weight Cycle & Routing Loop',
    badge: 'Loop & Blackhole Demo',
    description:
      'Engineered network containing directed links with negative metric costs (e.g. arbitration credits / discount peering). Forms a negative cycle R2 → R3 → R4 → R2.',
    algorithmNote:
      'Bellman-Ford successfully isolates the infinite negative loop on round |V| and alerts the operator. Floyd-Warshall shows negative values on the diagonal (dist[R2][R2] < 0). Packets trapped here cycle until TTL expires!',
    nodes: [
      { id: 'R1', name: 'Ingress Gateway', ip: '10.0.0.1', x: 120, y: 240, status: 'up', asNumber: 65001, role: 'gateway' },
      { id: 'R2', name: 'Arbitration Switch A', ip: '10.0.1.1', x: 340, y: 130, status: 'up', asNumber: 65002, role: 'core' },
      { id: 'R3', name: 'Carrier Peer B', ip: '10.0.2.1', x: 580, y: 130, status: 'up', asNumber: 65002, role: 'core' },
      { id: 'R4', name: 'Transit Node C', ip: '10.0.3.1', x: 460, y: 340, status: 'up', asNumber: 65002, role: 'core' },
      { id: 'R5', name: 'Egress Destination', ip: '10.0.4.1', x: 780, y: 240, status: 'up', asNumber: 65003, role: 'edge' },
    ],
    links: [
      { id: 'nl1', source: 'R1', target: 'R2', weight: 5, capacityGbps: 10, status: 'up', isDirectional: true },
      { id: 'nl2', source: 'R2', target: 'R3', weight: 4, capacityGbps: 40, status: 'up', isDirectional: true },
      { id: 'nl3', source: 'R3', target: 'R4', weight: -8, capacityGbps: 40, status: 'up', isDirectional: true }, // Negative weight edge!
      { id: 'nl4', source: 'R4', target: 'R2', weight: 2, capacityGbps: 40, status: 'up', isDirectional: true }, // Cycle weight: 4 + (-8) + 2 = -2!
      { id: 'nl5', source: 'R3', target: 'R5', weight: 6, capacityGbps: 10, status: 'up', isDirectional: true },
      { id: 'nl6', source: 'R1', target: 'R4', weight: 9, capacityGbps: 10, status: 'up', isDirectional: true },
    ],
  },
  {
    id: 'enterprise-sdwan',
    name: 'AWS Hybrid Cloud & Enterprise SD-WAN',
    badge: 'AWS / Cisco Topology',
    description:
      'Branch Office connected to AWS Cloud VPC via dual paths: AWS Direct Connect (ultra-low latency 8ms, dedicated) and Public Internet IPsec VPN (55ms backup).',
    algorithmNote:
      'Bellman-Ford prioritizes AWS Direct Connect. If the Direct Connect link is severed (click link to toggle Down), the distance vector algorithm dynamically shifts traffic to the IPsec VPN backup!',
    nodes: [
      { id: 'Branch', name: 'Branch Office Router', ip: '192.168.10.1', x: 120, y: 240, status: 'up', asNumber: 65100, role: 'edge' },
      { id: 'DX-GW', name: 'AWS Direct Connect GW', ip: '169.254.200.1', x: 380, y: 120, status: 'up', asNumber: 64512, role: 'gateway' },
      { id: 'VPN-GW', name: 'Internet IPsec Tunnel', ip: '203.0.113.15', x: 380, y: 360, status: 'up', asNumber: 64512, role: 'gateway' },
      { id: 'TGW', name: 'AWS Transit Gateway', ip: '10.100.0.1', x: 600, y: 240, status: 'up', asNumber: 64512, role: 'core' },
      { id: 'VPC-App', name: 'AWS Production VPC', ip: '10.0.1.50', x: 820, y: 160, status: 'up', asNumber: 64512, role: 'cloud' },
      { id: 'VPC-DB', name: 'AWS Aurora DB VPC', ip: '10.0.2.80', x: 820, y: 320, status: 'up', asNumber: 64512, role: 'cloud' },
    ],
    links: [
      { id: 'sd1', source: 'Branch', target: 'DX-GW', weight: 8, capacityGbps: 10, status: 'up', isDirectional: false },
      { id: 'sd2', source: 'Branch', target: 'VPN-GW', weight: 58, capacityGbps: 1, status: 'up', isDirectional: false },
      { id: 'sd3', source: 'DX-GW', target: 'TGW', weight: 4, capacityGbps: 100, status: 'up', isDirectional: false },
      { id: 'sd4', source: 'VPN-GW', target: 'TGW', weight: 12, capacityGbps: 10, status: 'up', isDirectional: false },
      { id: 'sd5', source: 'TGW', target: 'VPC-App', weight: 2, capacityGbps: 100, status: 'up', isDirectional: false },
      { id: 'sd6', source: 'TGW', target: 'VPC-DB', weight: 2, capacityGbps: 100, status: 'up', isDirectional: false },
      { id: 'sd7', source: 'VPC-App', target: 'VPC-DB', weight: 1, capacityGbps: 100, status: 'up', isDirectional: false },
    ],
  },
  {
    id: 'leaf-spine',
    name: 'Data Center Clos (Leaf-Spine) Architecture',
    badge: 'Clos Fabric',
    description:
      'High-bandwidth, deterministic non-blocking 2-stage Clos topology common in modern Amazon AWS and Google Cloud data centers. Every leaf is connected to every spine.',
    algorithmNote:
      'Floyd-Warshall computes exact 2-hop paths between any two leaf nodes with uniform, predictable 4ms intra-datacenter transit delay.',
    nodes: [
      { id: 'Spine1', name: 'Spine Switch 01', ip: '10.255.0.1', x: 340, y: 120, status: 'up', asNumber: 65200, role: 'core' },
      { id: 'Spine2', name: 'Spine Switch 02', ip: '10.255.0.2', x: 580, y: 120, status: 'up', asNumber: 65200, role: 'core' },
      { id: 'Leaf1', name: 'Leaf 01 (Rack A)', ip: '10.1.1.1', x: 140, y: 340, status: 'up', asNumber: 65201, role: 'edge' },
      { id: 'Leaf2', name: 'Leaf 02 (Rack B)', ip: '10.1.2.1', x: 360, y: 340, status: 'up', asNumber: 65202, role: 'edge' },
      { id: 'Leaf3', name: 'Leaf 03 (Rack C)', ip: '10.1.3.1', x: 580, y: 340, status: 'up', asNumber: 65203, role: 'edge' },
      { id: 'Leaf4', name: 'Leaf 04 (Rack D)', ip: '10.1.4.1', x: 800, y: 340, status: 'up', asNumber: 65204, role: 'edge' },
    ],
    links: [
      { id: 'ls1', source: 'Leaf1', target: 'Spine1', weight: 2, capacityGbps: 400, status: 'up', isDirectional: false },
      { id: 'ls2', source: 'Leaf1', target: 'Spine2', weight: 2, capacityGbps: 400, status: 'up', isDirectional: false },
      { id: 'ls3', source: 'Leaf2', target: 'Spine1', weight: 2, capacityGbps: 400, status: 'up', isDirectional: false },
      { id: 'ls4', source: 'Leaf2', target: 'Spine2', weight: 2, capacityGbps: 400, status: 'up', isDirectional: false },
      { id: 'ls5', source: 'Leaf3', target: 'Spine1', weight: 2, capacityGbps: 400, status: 'up', isDirectional: false },
      { id: 'ls6', source: 'Leaf3', target: 'Spine2', weight: 2, capacityGbps: 400, status: 'up', isDirectional: false },
      { id: 'ls7', source: 'Leaf4', target: 'Spine1', weight: 2, capacityGbps: 400, status: 'up', isDirectional: false },
      { id: 'ls8', source: 'Leaf4', target: 'Spine2', weight: 2, capacityGbps: 400, status: 'up', isDirectional: false },
    ],
  },
];
