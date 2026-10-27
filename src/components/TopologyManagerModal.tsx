/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RouterNode, NetworkLink } from '../types/network';
import { Upload, Download, Copy, Check, X, FileJson, AlertCircle } from 'lucide-react';

interface TopologyManagerModalProps {
  nodes: RouterNode[];
  links: NetworkLink[];
  isOpen: boolean;
  onClose: () => void;
  onImport: (newNodes: RouterNode[], newLinks: NetworkLink[]) => void;
}

export const TopologyManagerModal: React.FC<TopologyManagerModalProps> = ({
  nodes,
  links,
  isOpen,
  onClose,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentTopologyJson = JSON.stringify(
    {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes,
      links,
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(currentTopologyJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentTopologyJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-topology-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDoImport = () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importJsonText);
      if (!parsed.nodes || !Array.isArray(parsed.nodes) || !parsed.links || !Array.isArray(parsed.links)) {
        throw new Error('Invalid JSON format: Topology must contain "nodes" and "links" arrays.');
      }

      // Basic validation
      for (const node of parsed.nodes) {
        if (!node.id || typeof node.x !== 'number' || typeof node.y !== 'number') {
          throw new Error(`Invalid node object: Node ID or coordinates (x,y) missing on ${JSON.stringify(node)}`);
        }
      }

      for (const link of parsed.links) {
        if (!link.id || !link.source || !link.target || typeof link.weight !== 'number') {
          throw new Error(`Invalid link object: id, source, target, or weight missing on ${JSON.stringify(link)}`);
        }
      }

      onImport(parsed.nodes, parsed.links);
      onClose();
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse JSON.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden font-mono text-xs text-slate-200">
        {/* Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Topology Manager (JSON Export / Import)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Topology JSON</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2.5 font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Custom JSON</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {activeTab === 'export' ? (
            <div className="space-y-3">
              <p className="text-slate-400 text-[11px]">
                Copy or download this network graph configuration. It stores all router nodes, positions,
                IPs, roles, links, metrics, and directional properties.
              </p>
              <textarea
                readOnly
                value={currentTopologyJson}
                className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 font-mono text-[11px] focus:outline-none resize-none select-all"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 font-semibold transition cursor-pointer border border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center gap-1.5 font-semibold transition cursor-pointer shadow-md shadow-sky-900/40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json File</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-400 text-[11px]">
                Paste a valid topology JSON object containing <code>nodes</code> and <code>links</code> arrays:
              </p>
              <textarea
                value={importJsonText}
                onChange={(e) => {
                  setImportJsonText(e.target.value);
                  setImportError(null);
                }}
                placeholder='{"nodes": [...], "links": [...]}'
                className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 font-mono text-[11px] focus:border-sky-500 focus:outline-none resize-none"
              />

              {importError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-950/60 border border-red-800 rounded-lg text-red-300 text-[11px]">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setImportJsonText('');
                    setImportError(null);
                  }}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Clear
                </button>
                <button
                  onClick={handleDoImport}
                  disabled={!importJsonText.trim()}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg flex items-center gap-1.5 font-semibold transition cursor-pointer shadow-md shadow-sky-900/40"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Load Into Network</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
