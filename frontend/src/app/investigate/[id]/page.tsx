'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Trash2,
  Network,
  Table,
  Clock,
  Shield,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileCode,
  Info,
} from 'lucide-react';

import { getInvestigation, deleteInvestigation, getEvidence } from '@/lib/api';
import { Investigation, Entity, Relationship, Evidence } from '@/lib/types';
import NetworkGraph from '@/components/graph/NetworkGraph';
import EvidenceDrawer from '@/components/evidence/EvidenceDrawer';

export default function InvestigationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const investigationId = params?.id as string;

  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active View Tab: 'graph' | 'matrix' | 'timeline' | 'audit'
  const [activeTab, setActiveTab] = useState<'graph' | 'matrix' | 'timeline' | 'audit'>('graph');

  // Evidence Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  // Deletion loading state
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!investigationId) return;

    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const data = await getInvestigation(investigationId);
        if (isMounted) {
          setInvestigation(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load investigation.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [investigationId]);

  // Handle Node Inspection
  const handleSelectEntity = async (entity: Entity) => {
    setSelectedEntity(entity);
    setSelectedRelationship(null);
    setSelectedEvidence(null);
    setDrawerOpen(true);

    // Find any relationship referencing this entity to fetch evidence
    const relatedRel = investigation?.relationships.find(
      (r) => r.source_entity_id === entity.id || r.target_entity_id === entity.id
    );

    if (relatedRel?.evidence_id && investigationId) {
      try {
        const ev = await getEvidence(investigationId, relatedRel.evidence_id);
        setSelectedEvidence(ev);
      } catch (e) {
        // Non-blocking
      }
    }
  };

  // Handle Edge Inspection
  const handleSelectRelationship = async (rel: Relationship) => {
    setSelectedRelationship(rel);
    setSelectedEntity(null);
    setSelectedEvidence(null);
    setDrawerOpen(true);

    if (rel.evidence_id && investigationId) {
      try {
        const ev = await getEvidence(investigationId, rel.evidence_id);
        setSelectedEvidence(ev);
      } catch (e) {
        // Non-blocking
      }
    }
  };

  // Handle Export
  const handleExportJson = () => {
    if (!investigation) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(investigation, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `your-prints-dossier-${investigation.target_value}-${investigation.id.slice(0, 8)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handle Deletion
  const handleDelete = async () => {
    if (!investigation) return;
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this investigation? All graph nodes, edges, and evidence will be hard-purged immediately.'
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteInvestigation(investigation.id);
      router.push('/');
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 hairline-grid flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#111110]" />
        <div className="font-mono text-xs uppercase tracking-widest text-[#64635E]">
          SYNTHESIZING DIGITAL FOOTPRINT INTELLIGENCE...
        </div>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="flex-1 hairline-grid flex flex-col items-center justify-center p-12 space-y-4">
        <AlertTriangle className="w-8 h-8 text-[#C5221F]" />
        <h2 className="font-serif text-2xl text-[#111110]">Investigation Not Found</h2>
        <p className="font-mono text-xs text-[#64635E] max-w-md text-center">{error}</p>
        <Link
          href="/"
          className="px-6 py-3 bg-[#111110] text-white font-mono text-xs uppercase tracking-wider mt-4"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const { summary_stats, entities, relationships, provider_states } = investigation;

  return (
    <div className="flex-1 flex flex-col bg-[#FBFBFA]">
      {/* ========================================================================= */}
      {/* HEADER SECTION */}
      {/* ========================================================================= */}
      <div className="border-b border-[#E5E4DE] bg-white px-6 py-6 sticky top-[57px] z-30 shadow-subtle">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3 text-[11px] font-mono text-[#64635E] uppercase tracking-wider">
              <Link href="/" className="hover:text-[#111110] flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                <span>INVESTIGATE</span>
              </Link>
              <span>/</span>
              <span>DOSSIER: {investigation.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-[#111110] flex items-center gap-3">
              <span>{investigation.target_value}</span>
              <span className="text-xs font-mono px-2 py-0.5 bg-[#C8FF00]/20 text-[#111110] border border-[#C8FF00] uppercase tracking-wider font-semibold">
                {investigation.status}
              </span>
            </h1>
          </div>

          <div className="flex items-center space-x-3 font-mono text-xs">
            <button
              onClick={handleExportJson}
              className="px-4 py-2.5 bg-white border border-[#E5E4DE] hover:border-[#111110] text-[#111110] uppercase tracking-wider flex items-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Dossier (JSON)</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2.5 bg-[#FFF1F2] border border-[#FECDD3] hover:bg-[#FFE4E6] text-[#C5221F] uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Purging...' : 'Delete Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TELEMETRY METRICS BAR */}
      {/* ========================================================================= */}
      <div className="border-b border-[#E5E4DE] bg-[#FBFBFA] px-6 py-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-5 gap-4 font-mono text-xs">
          <div className="p-3 bg-white border border-[#E5E4DE]">
            <div className="text-[#64635E] text-[10px] uppercase">TOTAL ENTITIES</div>
            <div className="text-lg font-bold text-[#111110] mt-0.5">{summary_stats?.total_entities || entities.length}</div>
          </div>
          <div className="p-3 bg-white border border-[#E5E4DE]">
            <div className="text-[#64635E] text-[10px] uppercase">CONFIRMED LINKS</div>
            <div className="text-lg font-bold text-[#111110] mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#111110]"></span>
              <span>{summary_stats?.confirmed_links || 0}</span>
            </div>
          </div>
          <div className="p-3 bg-white border border-[#E5E4DE]">
            <div className="text-[#64635E] text-[10px] uppercase">STRONG MATCHES</div>
            <div className="text-lg font-bold text-[#111110] mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C8FF00] border border-[#111110]/30"></span>
              <span>{summary_stats?.strong_matches || 0}</span>
            </div>
          </div>
          <div className="p-3 bg-white border border-[#E5E4DE]">
            <div className="text-[#64635E] text-[10px] uppercase">POSSIBLE MATCHES</div>
            <div className="text-lg font-bold text-[#64635E] mt-0.5">{summary_stats?.possible_matches || 0}</div>
          </div>
          <div className="p-3 bg-white border border-[#E5E4DE]">
            <div className="text-[#64635E] text-[10px] uppercase">PROVIDERS POLLED</div>
            <div className="text-lg font-bold text-[#111110] mt-0.5">{Object.keys(provider_states || {}).length}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW SELECTOR TABS */}
      {/* ========================================================================= */}
      <div className="border-b border-[#E5E4DE] bg-white px-6">
        <div className="max-w-7xl mx-auto flex items-center space-x-8 font-mono text-xs uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('graph')}
            className={`py-4 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'graph'
                ? 'border-[#111110] text-[#111110] font-bold'
                : 'border-transparent text-[#64635E] hover:text-[#111110]'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>01 Graph View</span>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-4 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'matrix'
                ? 'border-[#111110] text-[#111110] font-bold'
                : 'border-transparent text-[#64635E] hover:text-[#111110]'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>02 Entity Matrix</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-4 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-[#111110] text-[#111110] font-bold'
                : 'border-transparent text-[#64635E] hover:text-[#111110]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>03 Timeline View</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-4 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-[#111110] text-[#111110] font-bold'
                : 'border-transparent text-[#64635E] hover:text-[#111110]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>04 Forensic Audit</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN VIEW CONTENT */}
      {/* ========================================================================= */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {/* TAB 1: GRAPH VIEW */}
        {activeTab === 'graph' && (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-[#64635E]">
              <span>INTERACTIVE RELATIONSHIP GRAPH // CLICK NODES OR EDGES TO INSPECT PROVENANCE</span>
              <span>DRAG NODES TO REORGANIZE</span>
            </div>
            <div className="w-full h-[600px]">
              <NetworkGraph
                entities={entities}
                relationships={relationships}
                onSelectEntity={handleSelectEntity}
                onSelectRelationship={handleSelectRelationship}
                selectedEntityId={selectedEntity?.id}
                selectedRelationshipId={selectedRelationship?.id}
              />
            </div>
          </div>
        )}

        {/* TAB 2: ENTITY MATRIX */}
        {activeTab === 'matrix' && (
          <div className="space-y-6 font-mono text-xs">
            <div className="bg-white border border-[#E5E4DE] shadow-subtle overflow-hidden">
              <div className="p-4 bg-[#FBFBFA] border-b border-[#E5E4DE] font-bold text-[#111110] flex justify-between items-center">
                <span>DISCOVERED ENTITIES ({entities.length})</span>
                <span className="text-[#64635E] font-normal">FILTERED BY EPHEMERAL TTL</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#FBFBFA] text-[#64635E] border-b border-[#E5E4DE] uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Type</th>
                      <th className="p-3">Display Label</th>
                      <th className="p-3">Canonical Value</th>
                      <th className="p-3">Attributes</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E4DE] text-xs">
                    {entities.map((ent) => (
                      <tr key={ent.id} className="hover:bg-[#FBFBFA] transition-colors">
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-[#F4F3EF] border border-[#E5E4DE] text-[#111110] font-semibold text-[10px]">
                            {ent.entity_type}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-[#111110]">{ent.display_label}</td>
                        <td className="p-3 text-[#64635E] font-mono">{ent.canonical_value}</td>
                        <td className="p-3 text-[#64635E] text-[11px] max-w-xs truncate">
                          {JSON.stringify(ent.attributes)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleSelectEntity(ent)}
                            className="px-2.5 py-1 bg-[#111110] text-white hover:bg-[#2A2A28] text-[10px] uppercase tracking-wider"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-[#E5E4DE] shadow-subtle overflow-hidden">
              <div className="p-4 bg-[#FBFBFA] border-b border-[#E5E4DE] font-bold text-[#111110] flex justify-between items-center">
                <span>CORRELATED RELATIONSHIPS ({relationships.length})</span>
                <span className="text-[#64635E] font-normal">CLASSIFIED BY CONFIDENCE ENGINE</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#FBFBFA] text-[#64635E] border-b border-[#E5E4DE] uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Relationship Type</th>
                      <th className="p-3">Confidence Status</th>
                      <th className="p-3">Inference Rationale</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E4DE] text-xs">
                    {relationships.map((rel) => (
                      <tr key={rel.id} className="hover:bg-[#FBFBFA] transition-colors">
                        <td className="p-3 font-semibold text-[#111110]">{rel.relationship_type}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-[#111110] text-[#C8FF00] text-[10px] font-bold">
                            {rel.confidence}
                          </span>
                        </td>
                        <td className="p-3 text-[#64635E] text-[11px] font-sans max-w-md">
                          {rel.inference_rationale}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleSelectRelationship(rel)}
                            className="px-2.5 py-1 bg-[#111110] text-white hover:bg-[#2A2A28] text-[10px] uppercase tracking-wider"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TIMELINE VIEW */}
        {activeTab === 'timeline' && (
          <div className="max-w-3xl mx-auto space-y-6 font-mono text-xs">
            <div className="text-xs font-mono text-[#64635E] uppercase tracking-wider">
              CHRONOLOGICAL RECONSTRUCTION OF DISCOVERED EVENTS
            </div>
            <div className="relative border-l-2 border-[#E5E4DE] ml-4 space-y-8 py-2">
              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 bg-[#C8FF00] border-2 border-[#111110] rounded-full"></div>
                <div className="text-[10px] text-[#64635E]">INVESTIGATION INITIATED</div>
                <div className="font-bold text-[#111110] text-sm mt-0.5">
                  {new Date(investigation.created_at).toUTCString()}
                </div>
                <p className="font-sans text-xs text-[#64635E] mt-1">
                  Target email &lsquo;{investigation.target_value}&rsquo; submitted for public digital footprint mapping.
                </p>
              </div>

              {entities
                .filter((e) => e.attributes?.account_created_at || e.attributes?.event_date)
                .map((e, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute -left-[7px] top-1.5 w-3 h-3 bg-[#111110] rounded-full"></div>
                    <div className="text-[10px] text-[#64635E]">
                      {e.attributes?.action?.toUpperCase() || 'ACCOUNT REGISTERED'}
                    </div>
                    <div className="font-bold text-[#111110] text-sm mt-0.5">
                      {e.attributes?.account_created_at || e.attributes?.event_date}
                    </div>
                    <p className="font-sans text-xs text-[#64635E] mt-1">
                      {e.display_label}
                    </p>
                  </div>
                ))}

              <div className="relative pl-6">
                <div className="absolute -left-[7px] top-1.5 w-3 h-3 bg-[#111110] rounded-full"></div>
                <div className="text-[10px] text-[#64635E]">GRAPH SYNTHESIS COMPLETED</div>
                <div className="font-bold text-[#111110] text-sm mt-0.5">
                  {investigation.completed_at
                    ? new Date(investigation.completed_at).toUTCString()
                    : 'Active'}
                </div>
                <p className="font-sans text-xs text-[#64635E] mt-1">
                  All provider queries resolved and correlated with explicit evidentiary provenance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FORENSIC AUDIT */}
        {activeTab === 'audit' && (
          <div className="space-y-6 font-mono text-xs">
            <div className="bg-white border border-[#E5E4DE] p-6 shadow-subtle space-y-4">
              <div className="font-bold text-[#111110] text-sm uppercase tracking-wider border-b border-[#E5E4DE] pb-2">
                PROVIDER EXECUTION TELEMETRY
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(provider_states || {}).map(([prov, state]) => (
                  <div key={prov} className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-1">
                    <div className="text-[10px] text-[#64635E] uppercase truncate">{prov}</div>
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span className="text-[#111110]">{prov.split(':')[0]}</span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] uppercase font-bold ${
                          state === 'SUCCESS'
                            ? 'bg-[#C8FF00]/30 text-[#111110]'
                            : state === 'NO_RESULTS'
                            ? 'bg-[#F4F3EF] text-[#64635E]'
                            : 'bg-[#FFF1F2] text-[#C5221F]'
                        }`}
                      >
                        {state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-[#F4F3EF] border border-[#E5E4DE] space-y-2">
              <div className="font-bold text-[#111110] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#111110]" />
                EPHEMERAL RETENTION COMPLIANCE
              </div>
              <p className="font-sans text-xs text-[#64635E] leading-relaxed">
                This investigation will automatically expire and be purged from database storage at{' '}
                <span className="font-mono text-[#111110] font-semibold">
                  {investigation.expires_at
                    ? new Date(investigation.expires_at).toUTCString()
                    : '48 Hours from execution'}
                </span>
                . You can also purge it immediately using the &ldquo;Delete Now&rdquo; button above.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Forensic Evidence Drawer */}
      <EvidenceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        selectedEntity={selectedEntity}
        selectedRelationship={selectedRelationship}
        evidence={selectedEvidence}
      />
    </div>
  );
}
