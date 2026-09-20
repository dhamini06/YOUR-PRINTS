'use client';

import React from 'react';
import { X, ExternalLink, ShieldCheck, FileText, AlertCircle, Copy, Check } from 'lucide-react';
import { Entity, Relationship, Evidence } from '@/lib/types';

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEntity?: Entity | null;
  selectedRelationship?: Relationship | null;
  evidence?: Evidence | null;
}

export default function EvidenceDrawer({
  isOpen,
  onClose,
  selectedEntity,
  selectedRelationship,
  evidence,
}: EvidenceDrawerProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || (!selectedEntity && !selectedRelationship)) {
    return null;
  }

  const title = selectedEntity
    ? selectedEntity.display_label
    : `${selectedRelationship?.relationship_type} Link`;

  const entityType = selectedEntity?.entity_type;
  const relationshipType = selectedRelationship?.relationship_type;
  const confidence = selectedRelationship?.confidence || 'CONFIRMED_ASSOCIATION';

  const copyId = () => {
    const idToCopy = selectedEntity?.id || selectedRelationship?.id || '';
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getConfidenceBadge = (conf: string) => {
    switch (conf) {
      case 'CONFIRMED_ASSOCIATION':
        return (
          <span className="px-2 py-0.5 bg-[#C8FF00]/20 text-[#111110] border border-[#C8FF00] font-mono text-[10px] uppercase tracking-wider font-semibold">
            CONFIRMED ASSOCIATION
          </span>
        );
      case 'STRONG_MATCH':
        return (
          <span className="px-2 py-0.5 bg-[#111110] text-[#C8FF00] font-mono text-[10px] uppercase tracking-wider font-semibold">
            STRONG MATCH
          </span>
        );
      case 'POSSIBLE_MATCH':
        return (
          <span className="px-2 py-0.5 bg-[#F4F3EF] text-[#64635E] border border-[#E5E4DE] font-mono text-[10px] uppercase tracking-wider font-semibold">
            POSSIBLE MATCH
          </span>
        );
      case 'WEAK_SIGNAL':
        return (
          <span className="px-2 py-0.5 bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] font-mono text-[10px] uppercase tracking-wider font-semibold">
            WEAK SIGNAL (COLLISION PENALTY)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-[#FBFBFA] text-[#9E9D97] border border-[#E5E4DE] font-mono text-[10px] uppercase tracking-wider">
            UNVERIFIED
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-[#E5E4DE] shadow-2xl z-50 flex flex-col animate-slideLeft">
      {/* Header */}
      <div className="p-6 border-b border-[#E5E4DE] flex items-start justify-between bg-[#FBFBFA]">
        <div className="space-y-1.5 pr-4">
          <div className="font-mono text-[10px] text-[#64635E] uppercase tracking-widest flex items-center gap-2">
            <span>FORENSIC EVIDENCE RECORD</span>
            <span className="text-[#D6D5CD]">{'//'}</span>
            <span>{entityType || relationshipType}</span>
          </div>
          <h3 className="font-serif text-xl md:text-2xl text-[#111110] leading-snug break-all">
            {title}
          </h3>
          <div className="pt-1">{getConfidenceBadge(confidence)}</div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-[#64635E] hover:text-[#111110] hover:bg-[#EFEFEA] rounded transition-colors"
          aria-label="Close Drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-mono">
        {/* Section 1: Observation Metadata */}
        <div className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-3">
          <div className="font-bold text-[#111110] border-b border-[#E5E4DE] pb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#111110]" />
              OBSERVATION METADATA
            </span>
            <button
              onClick={copyId}
              className="text-[10px] text-[#64635E] hover:text-[#111110] flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-[#111110]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'COPIED' : 'COPY ID'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <div className="text-[#64635E]">DISCOVERY METHOD</div>
              <div className="text-[#111110] font-semibold mt-0.5">
                {evidence?.discovery_method || 'PIPELINE_CORRELATION'}
              </div>
            </div>
            <div>
              <div className="text-[#64635E]">SOURCE PROVIDER</div>
              <div className="text-[#111110] font-semibold mt-0.5">
                {evidence?.source_label || 'YOUR-PRINTS Engine'}
              </div>
            </div>
            <div>
              <div className="text-[#64635E]">OBSERVATION FIDELITY</div>
              <div className="text-[#111110] font-semibold mt-0.5">
                {evidence?.observation_confidence || 'RELIABLE'}
              </div>
            </div>
            <div>
              <div className="text-[#64635E]">TIMESTAMP</div>
              <div className="text-[#111110] font-semibold mt-0.5">
                {evidence?.observed_at
                  ? new Date(evidence.observed_at).toUTCString()
                  : new Date().toUTCString()}
              </div>
            </div>
          </div>

          {evidence?.source_url && (
            <div className="pt-2 border-t border-[#E5E4DE]">
              <div className="text-[#64635E] text-[10px] mb-1">SOURCE URI</div>
              <a
                href={evidence.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#111110] underline flex items-center gap-1 hover:text-[#64635E] break-all"
              >
                <span>{evidence.source_url}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Section 2: Forensic Rationale & Attribution */}
        <div className="p-4 bg-white border border-[#E5E4DE] space-y-3">
          <div className="font-bold text-[#111110] border-b border-[#E5E4DE] pb-2 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#111110]" />
            EVIDENTIARY RATIONALE
          </div>

          <p className="font-sans text-xs text-[#111110] leading-relaxed">
            {selectedRelationship?.inference_rationale ||
              evidence?.rationale ||
              'Entity discovered and correlated via standard pipeline execution.'}
          </p>

          {evidence?.observed_value && (
            <div className="p-3 bg-[#F4F3EF] border border-[#E5E4DE] text-[11px] text-[#64635E] break-all">
              <span className="font-bold text-[#111110]">Raw Observed Value: </span>
              {evidence.observed_value}
            </div>
          )}
        </div>

        {/* Section 3: Entity Attributes (If Entity) */}
        {selectedEntity?.attributes && Object.keys(selectedEntity.attributes).length > 0 && (
          <div className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-3">
            <div className="font-bold text-[#111110] border-b border-[#E5E4DE] pb-2">
              EXTRACTED ATTRIBUTES
            </div>
            <div className="space-y-2 text-[11px]">
              {Object.entries(selectedEntity.attributes).map(([key, val]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:justify-between border-b border-[#EFEFEA] pb-1 gap-1">
                  <span className="text-[#64635E] uppercase">{key}</span>
                  <span className="text-[#111110] font-semibold break-all text-right">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Epistemological Cautionary Note */}
        <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] space-y-2 text-[11px]">
          <div className="font-bold flex items-center gap-1.5 uppercase">
            <AlertCircle className="w-3.5 h-3.5" />
            Epistemological Boundary Notice
          </div>
          <p className="font-sans text-[11px] leading-relaxed">
            Observations are immutable technical facts, but identity associations remain inferences. Always verify secondary corroboration (display names, domain back-links) before asserting real-world human identity.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#E5E4DE] bg-[#FBFBFA] flex items-center justify-between text-xs font-mono">
        <span className="text-[#64635E]">EVIDENCE BEFORE INFERENCE</span>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-[#111110] text-white hover:bg-[#2A2A28] uppercase text-[11px] tracking-wider"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
