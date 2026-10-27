/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NetworkPacket } from '../types/network';
import { Shield, Cpu, Activity, X, Copy, Check, Binary } from 'lucide-react';

interface PacketHeaderModalProps {
  packet: NetworkPacket | null;
  onClose: () => void;
}

export const PacketHeaderModal: React.FC<PacketHeaderModalProps> = ({ packet, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!packet) return null;

  const header = packet.header || {
    version: 4,
    ihl: 5,
    tos: '0x00 (DSCP CS0, ECN 0)',
    totalLength: 64,
    identification: 18420,
    flags: '0x02 (Don\'t Fragment)',
    ttl: packet.ttl,
    protocol: 'TCP' as const,
    checksum: '0xa4c2',
    srcIp: '10.0.1.1',
    destIp: '10.0.4.1',
    srcMac: '52:54:00:12:34:56',
    destMac: '52:54:00:ab:cd:ef',
  };

  // Convert payload to hex dump representation
  const hexDump = Array.from(packet.payload)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ');

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(packet, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-mono text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="bg-slate-950 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: packet.color }}
            />
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              Deep Packet Header & Frame Inspector (Wireshark-Style)
            </h3>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
              #{packet.id.slice(-6)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Copy Packet JSON"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status & Transit Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 block">Status</span>
              <span
                className={`font-bold uppercase text-[11px] ${
                  packet.status === 'delivered'
                    ? 'text-emerald-400'
                    : packet.status === 'in_transit'
                    ? 'text-sky-400'
                    : 'text-red-400'
                }`}
              >
                {packet.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Current TTL</span>
              <span className="text-amber-400 font-bold">
                {packet.ttl} <span className="text-slate-500 text-[10px]">/ {packet.maxTtl} hops</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Total Latency</span>
              <span className="text-emerald-400 font-bold">{packet.totalLatency} ms</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Hops Visited</span>
              <span className="text-sky-300 font-bold">{packet.visitedHops.length} hops</span>
            </div>
          </div>

          {/* Layer 2: Ethernet II Frame */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span className="text-indigo-400 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" />
                Layer 2: Ethernet II Frame
              </span>
              <span className="text-slate-500 font-normal">Payload: 0x0800 (IPv4)</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Source MAC:</span>
                <span className="text-indigo-300">{header.srcMac}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Destination MAC:</span>
                <span className="text-indigo-300">{header.destMac}</span>
              </div>
            </div>
          </div>

          {/* Layer 3: IPv4 Header (RFC 791) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span className="text-sky-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                Layer 3: Internet Protocol Version 4 (IPv4)
              </span>
              <span className="text-slate-500 font-normal">Header Length: 20 bytes</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Version / IHL:</span>
                <span className="text-sky-300">IPv{header.version} (5 dwords)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Type of Service:</span>
                <span className="text-sky-300">{header.tos}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Identification:</span>
                <span className="text-sky-300">0x{header.identification.toString(16)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Header Checksum:</span>
                <span className="text-emerald-400">{header.checksum} (verified)</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-[10px]">Source IP:</span>
                <span className="text-emerald-300 font-bold">{header.srcIp}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-[10px]">Destination IP:</span>
                <span className="text-amber-300 font-bold">{header.destIp}</span>
              </div>
            </div>
          </div>

          {/* Layer 4 & Payload Dump */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span className="text-amber-400 flex items-center gap-1">
                <Binary className="w-3.5 h-3.5" />
                Layer 4 & Application Payload
              </span>
              <span className="text-slate-500 font-normal">{packet.payload.length} bytes</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">ASCII Payload:</span>
                <span className="text-amber-300 font-bold font-mono">"{packet.payload}"</span>
              </div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                Hex Representation:
              </div>
              <div className="font-mono text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800 overflow-x-auto">
                {hexDump}
              </div>
            </div>
          </div>

          {/* Hop Traversal Path */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1.5">
            <span className="text-slate-400 text-[11px] font-bold block">
              Routing Hop Trace:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {packet.visitedHops.map((h, idx) => (
                <React.Fragment key={idx}>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-bold border border-slate-700">
                    {h}
                  </span>
                  {idx < packet.visitedHops.length - 1 && (
                    <span className="text-slate-600">➔</span>
                  )}
                </React.Fragment>
              ))}
              {packet.status === 'in_transit' && (
                <>
                  <span className="text-slate-600">➔</span>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                    {packet.targetHopId} (en route)
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
