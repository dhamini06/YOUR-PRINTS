'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  Copy,
  Check,
  FileText,
  Search,
  Filter,
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

  // Active View Tab: 'graph' | 'matrix' | 'timeline' | 'audit' | 'exposure'
  const [activeTab, setActiveTab] = useState<'graph' | 'matrix' | 'timeline' | 'audit' | 'exposure'>('graph');

  // Copy link status
  const [copiedLink, setCopiedLink] = useState(false);

  // Entity matrix search & filter
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixTypeFilter, setMatrixTypeFilter] = useState('ALL');

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
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadData() {
      try {
        const data = await getInvestigation(investigationId);
        if (!isMounted) return;

        setInvestigation(data);
        setError(null);
        setLoading(false);

        // Auto-poll if investigation is actively progressing through stages
        const terminalStatuses = ['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED'];
        if (!terminalStatuses.includes(data.status)) {
          pollTimer = setTimeout(loadData, 1500);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load investigation.');
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
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

  // Handle Copy Link
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Handle Export Markdown Dossier
  const handleExportMarkdown = () => {
    if (!investigation) return;
    const lines = [
      `# YOUR-PRINTS INTELLIGENCE DOSSIER`,
      ``,
      `> **Target Identifier**: \`${investigation.target_value}\``,
      `> **Investigation ID**: \`${investigation.id}\``,
      `> **Status**: ${investigation.status}`,
      `> **Generated**: ${new Date(investigation.created_at).toUTCString()}`,
      `> **Policy**: Ephemeral Retention (48-Hour Purge Window)`,
      ``,
      `---`,
      ``,
      `## 1. Executive Telemetry Overview`,
      ``,
      `- **Total Discovered Entities**: ${investigation.summary_stats?.total_entities || investigation.entities.length}`,
      `- **Confirmed Associations**: ${investigation.summary_stats?.confirmed_links || 0}`,
      `- **Strong Matches**: ${investigation.summary_stats?.strong_matches || 0}`,
      `- **Possible Matches**: ${investigation.summary_stats?.possible_matches || 0}`,
      `- **Public Exposures Detected**: ${investigation.summary_stats?.exposure_count || 0}`,
      ``,
      `---`,
      ``,
      `## 2. Discovered Entities Matrix`,
      ``,
      `| Type | Label | Canonical Value | Attributes |`,
      `| :--- | :--- | :--- | :--- |`,
      ...investigation.entities.map(
        (e) => `| \`${e.entity_type}\` | ${e.display_label} | \`${e.canonical_value}\` | ${JSON.stringify(e.attributes).replace(/\|/g, '\\|')} |`
      ),
      ``,
      `---`,
      ``,
      `## 3. Correlated Relationships & Identity Claims`,
      ``,
      `| Relationship Type | Confidence Claim | Inference Rationale |`,
      `| :--- | :--- | :--- |`,
      ...investigation.relationships.map(
        (r) => `| \`${r.relationship_type}\` | **${r.confidence}** | ${r.inference_rationale.replace(/\|/g, '\\|')} |`
      ),
      ``,
      `---`,
      ``,
      `## 4. Public Breach Disclosures & Exposure Catalog`,
      ``,
      ...(investigation.entities.filter((e) => e.entity_type === 'EXPOSURE_EVENT').length > 0
        ? investigation.entities
            .filter((e) => e.entity_type === 'EXPOSURE_EVENT')
            .map(
              (e) =>
                `- **${e.display_label}** (${e.attributes?.year || 'Historical'}): ${e.attributes?.description || 'Public breach catalog disclosure record.'}`
            )
        : ['_No known public breach disclosures detected for this target._']),
      ``,
      `---`,
      ``,
      `*Evidence Before Inference. Generated by YOUR-PRINTS: Digital Footprint Intelligence.*`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `your-prints-dossier-${investigation.target_value}-${investigation.id.slice(0, 8)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Handle Export JSON
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

  // Memoized Entity Matrix filtering
  const availableEntityTypes = useMemo(() => {
    if (!investigation) return ['ALL'];
    const types = Array.from(new Set(investigation.entities.map((e) => e.entity_type)));
    return ['ALL', ...types];
  }, [investigation]);

  const filteredEntities = useMemo(() => {
    if (!investigation) return [];
    return investigation.entities.filter((ent) => {
      const matchesType = matrixTypeFilter === 'ALL' || ent.entity_type === matrixTypeFilter;
      const matchesSearch =
        !matrixSearch ||
        ent.display_label.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        ent.canonical_value.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        ent.entity_type.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        JSON.stringify(ent.attributes).toLowerCase().includes(matrixSearch.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [investigation, matrixTypeFilter, matrixSearch]);

  const filteredRelationships = useMemo(() => {
    if (!investigation) return [];
    const validEntityIds = new Set(filteredEntities.map((e) => e.id));
    return investigation.relationships.filter((rel) => {
      const isConnected =
        validEntityIds.has(rel.source_entity_id) || validEntityIds.has(rel.target_entity_id);
      const matchesSearch =
        !matrixSearch ||
        rel.relationship_type.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        rel.confidence.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        rel.inference_rationale.toLowerCase().includes(matrixSearch.toLowerCase());
      return isConnected || matchesSearch;
    });
  }, [investigation, filteredEntities, matrixSearch]);

  // Memoized Chronological Timeline Events
  const timelineEvents = useMemo(() => {
    if (!investigation) return [];
    const events: Array<{
      id: string;
      category: 'INITIATION' | 'REGISTRATION' | 'EXPOSURE' | 'DOMAIN' | 'COMPLETION';
      title: string;
      dateDisplay: string;
      timestamp: number;
      description: string;
      badge: string;
      badgeColor: string;
      entity?: Entity;
    }> = [];

    // 1. Investigation Initiation
    const initDate = new Date(investigation.created_at);
    events.push({
      id: 'init-0',
      category: 'INITIATION',
      title: 'Investigation Initiated',
      dateDisplay: initDate.toUTCString(),
      timestamp: initDate.getTime(),
      description: `Target email '${investigation.target_value}' submitted for public digital footprint mapping.`,
      badge: 'PIPELINE START',
      badgeColor: 'bg-[#C8FF00] text-[#111110] border border-[#111110]',
    });

    // 2. Discoveries with dates
    for (const ent of investigation.entities) {
      // Account registrations (GitHub, GitLab, Hacker News, Dev.to, Keybase)
      if (ent.attributes?.account_created_at) {
        const rawDate = ent.attributes.account_created_at;
        let dDisplay = String(rawDate);
        let ts = 0;
        if (/^\d{9,12}$/.test(String(rawDate).trim())) {
          const epochMs = parseInt(String(rawDate), 10) * 1000;
          const d = new Date(epochMs);
          if (!isNaN(d.getTime())) {
            dDisplay = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            ts = epochMs;
          }
        } else {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            dDisplay = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            ts = d.getTime();
          }
        }
        const platform = ent.attributes?.platform || 'Public';
        events.push({
          id: ent.id,
          category: 'REGISTRATION',
          title: `${platform} Public Profile Discovered`,
          dateDisplay: dDisplay,
          timestamp: ts,
          description: `${ent.display_label}${ent.attributes?.bio ? ` — "${ent.attributes.bio.slice(0, 80)}..."` : ''}`,
          badge: `${platform.toUpperCase()}`,
          badgeColor: 'bg-[#111110] text-[#C8FF00]',
          entity: ent,
        });
      }

      // Exposure / Breach disclosure events
      if (ent.entity_type === 'EXPOSURE_EVENT') {
        const bDate = ent.attributes?.breach_date || ent.attributes?.year || 'Historical Disclosure';
        let ts = 0;
        const d = new Date(bDate);
        if (!isNaN(d.getTime())) {
          ts = d.getTime();
        }
        const classes = Array.isArray(ent.attributes?.compromised_data_classes)
          ? ent.attributes.compromised_data_classes.join(', ')
          : 'Identity signals';
        events.push({
          id: ent.id,
          category: 'EXPOSURE',
          title: `Public Breach Disclosure: ${ent.attributes?.breach_title || ent.display_label}`,
          dateDisplay: String(bDate),
          timestamp: ts,
          description: `Disclosed attributes: ${classes}. Appeared in public disclosure catalog for ${ent.attributes?.domain || 'external service'}.`,
          badge: 'BREACH CATALOG',
          badgeColor: 'bg-[#FFF1F2] text-[#B91C1C] border border-[#FECDD3]',
          entity: ent,
        });
      }
    }

    // 3. Pipeline Completion
    if (investigation.completed_at) {
      const compDate = new Date(investigation.completed_at);
      events.push({
        id: 'comp-end',
        category: 'COMPLETION',
        title: 'Intelligence Graph Synthesis Completed',
        dateDisplay: compDate.toUTCString(),
        timestamp: compDate.getTime() + 1,
        description: `All ${Object.keys(investigation.provider_states || {}).length} OSINT providers resolved and correlated into ${investigation.entities.length} entities and ${investigation.relationships.length} evidentiary links.`,
        badge: 'COMPLETED',
        badgeColor: 'bg-[#111110] text-white',
      });
    }

    // Sort chronologically
    return events.sort((a, b) => {
      if (a.category === 'INITIATION') return -1;
      if (b.category === 'INITIATION') return 1;
      if (a.category === 'COMPLETION') return 1;
      if (b.category === 'COMPLETION') return -1;
      return a.timestamp - b.timestamp;
    });
  }, [investigation]);

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

  // Active progressive execution view while investigation pipeline is running
  if (!['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED'].includes(investigation.status)) {
    const stages = [
      {
        num: '01',
        title: 'TARGET VALIDATION',
        desc: 'Syntax, DNS records, MX mail server resolution',
        isActive: investigation.current_stage.startsWith('01'),
        isPassed: !investigation.current_stage.startsWith('01'),
      },
      {
        num: '02',
        title: 'PUBLIC SIGNAL DISCOVERY',
        desc: 'Gravatar, ICANN RDAP, OpenPGP verifying keyserver',
        isActive: investigation.current_stage.startsWith('02'),
        isPassed:
          investigation.current_stage.startsWith('03') ||
          investigation.current_stage.startsWith('04') ||
          investigation.current_stage.startsWith('05'),
      },
      {
        num: '03',
        title: 'IDENTITY CORRELATION',
        desc: 'GitHub, GitLab, Keybase secondary username pivoting',
        isActive: investigation.current_stage.startsWith('03'),
        isPassed:
          investigation.current_stage.startsWith('04') ||
          investigation.current_stage.startsWith('05'),
      },
      {
        num: '04',
        title: 'EXPOSURE ANALYSIS',
        desc: 'Public breach catalogs with masked attributes',
        isActive: investigation.current_stage.startsWith('04'),
        isPassed: investigation.current_stage.startsWith('05'),
      },
      {
        num: '05',
        title: 'DIGITAL FOOTPRINT GRAPH',
        desc: 'Three-tier confidence scoring and evidence linking',
        isActive: investigation.current_stage.startsWith('05'),
        isPassed: false,
      },
    ];

    return (
      <div className="flex-1 hairline-grid flex flex-col justify-center items-center p-6 md:p-12 bg-[#FBFBFA]">
        <div className="max-w-4xl w-full bg-white border border-[#E5E4DE] shadow-subtle p-6 md:p-8 space-y-8 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E4DE] pb-6 gap-4">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-[#64635E] uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C8FF00] border border-[#111110]/30 animate-pulse" />
                <span>ACTIVE INVESTIGATION PIPELINE // {investigation.id}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif text-[#111110]">
                {investigation.target_value}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#111110] text-[#C8FF00] font-mono text-xs uppercase tracking-wider font-semibold">
                {investigation.status}
              </span>
            </div>
          </div>

          {/* 5-Stage Progressive Cards */}
          <div className="space-y-3">
            <div className="text-xs font-mono text-[#64635E] uppercase tracking-wider flex items-center justify-between">
              <span>Investigation Lifecycle Execution</span>
              <span className="text-[10px] text-[#111110] font-semibold flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-[#111110]" />
                <span>POLLING PROVIDER TELEMETRY (1.5S)</span>
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {stages.map((stage) => {
                const isCurrent = stage.isActive;
                const isDone = stage.isPassed;
                return (
                  <div
                    key={stage.num}
                    className={`p-4 border flex flex-col justify-between transition-all ${
                      isCurrent
                        ? 'bg-[#111110] text-white border-[#111110] shadow-md scale-[1.02]'
                        : isDone
                        ? 'bg-[#F4F3EF] text-[#111110] border-[#E5E4DE]'
                        : 'bg-[#FBFBFA] text-[#9E9D97] border-[#E5E4DE]/60'
                    }`}
                  >
                    <div>
                      <div
                        className={`font-mono text-[10px] font-bold flex items-center justify-between ${
                          isCurrent
                            ? 'text-[#C8FF00]'
                            : isDone
                            ? 'text-[#111110]'
                            : 'text-[#9E9D97]'
                        }`}
                      >
                        <span>STAGE {stage.num}</span>
                        {isDone && <CheckCircle2 className="w-3 h-3 text-[#111110]" />}
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF00] animate-ping" />
                        )}
                      </div>
                      <div
                        className={`font-mono text-xs font-bold mt-2 ${
                          isCurrent ? 'text-white' : isDone ? 'text-[#111110]' : 'text-[#64635E]'
                        }`}
                      >
                        {stage.title}
                      </div>
                    </div>
                    <div
                      className={`font-sans text-[11px] mt-4 leading-relaxed ${
                        isCurrent ? 'text-[#D6D5CD]' : isDone ? 'text-[#64635E]' : 'text-[#9E9D97]'
                      }`}
                    >
                      {stage.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Provider Telemetry Matrix (if any queried so far) */}
          {investigation.provider_states && Object.keys(investigation.provider_states).length > 0 && (
            <div className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-2">
              <div className="text-[10px] font-mono text-[#64635E] uppercase tracking-wider">
                ACTIVE PROVIDER TELEMETRY
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(investigation.provider_states).map(([prov, st]) => (
                  <div
                    key={prov}
                    className="px-2 py-1 bg-white border border-[#E5E4DE] text-[10px] font-mono flex items-center gap-1.5"
                  >
                    <span className="text-[#64635E]">{prov}:</span>
                    <span
                      className={`font-bold ${
                        st === 'SUCCESS'
                          ? 'text-[#111110]'
                          : st === 'NO_RESULTS'
                          ? 'text-[#9E9D97]'
                          : 'text-[#C5221F]'
                      }`}
                    >
                      {st}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ephemeral Guarantee Footer */}
          <div className="p-4 bg-[#F4F3EF] border border-[#E5E4DE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center space-x-2 text-[#64635E]">
              <Shield className="w-4 h-4 text-[#111110]" />
              <span>Evidence Before Inference. Ephemeral 48-Hour Retention Window.</span>
            </div>
            <Link
              href="/"
              className="text-[#64635E] hover:text-[#111110] underline text-[11px]"
            >
              Cancel & Return Home
            </Link>
          </div>
        </div>
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

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-white border border-[#E5E4DE] hover:border-[#111110] text-[#111110] uppercase tracking-wider flex items-center gap-2 transition-colors shadow-subtle"
              title="Copy shareable link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#111110]" />
                  <span>Copied Link</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#64635E]" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
            <button
              onClick={handleExportMarkdown}
              className="px-3.5 py-2 bg-white border border-[#E5E4DE] hover:border-[#111110] text-[#111110] uppercase tracking-wider flex items-center gap-2 transition-colors shadow-subtle"
              title="Export as Markdown Intelligence Briefing"
            >
              <FileText className="w-3.5 h-3.5 text-[#64635E]" />
              <span>Export (.MD)</span>
            </button>
            <button
              onClick={handleExportJson}
              className="px-3.5 py-2 bg-white border border-[#E5E4DE] hover:border-[#111110] text-[#111110] uppercase tracking-wider flex items-center gap-2 transition-colors shadow-subtle"
              title="Export complete raw dossier as JSON"
            >
              <Download className="w-3.5 h-3.5 text-[#64635E]" />
              <span>Export (.JSON)</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3.5 py-2 bg-[#FFF1F2] border border-[#FECDD3] hover:bg-[#FFE4E6] text-[#C5221F] uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
              title="Immediately purge all graph nodes, records, and evidence"
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
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 font-mono text-xs">
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
            <div className="text-[#64635E] text-[10px] uppercase">EXPOSURES DETECTED</div>
            <div className={`text-lg font-bold mt-0.5 flex items-center gap-1.5 ${
              (summary_stats?.exposure_count || 0) > 0 ? 'text-[#B91C1C]' : 'text-[#64635E]'
            }`}>
              <AlertTriangle className={`w-3.5 h-3.5 ${
                (summary_stats?.exposure_count || 0) > 0 ? 'text-[#B91C1C]' : 'text-[#9E9D97]'
              }`} />
              <span>{summary_stats?.exposure_count || 0}</span>
            </div>
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
        <div className="max-w-7xl mx-auto flex items-center space-x-6 sm:space-x-8 font-mono text-xs uppercase tracking-wider overflow-x-auto">
          <button
            onClick={() => setActiveTab('graph')}
            className={`py-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
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
            className={`py-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
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
            className={`py-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'border-[#111110] text-[#111110] font-bold'
                : 'border-transparent text-[#64635E] hover:text-[#111110]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>03 Timeline ({timelineEvents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-[#111110] text-[#111110] font-bold'
                : 'border-transparent text-[#64635E] hover:text-[#111110]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>04 Forensic Audit</span>
          </button>
          <button
            onClick={() => setActiveTab('exposure')}
            className={`py-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'exposure'
                ? 'border-[#B91C1C] text-[#B91C1C] font-bold'
                : 'border-transparent text-[#64635E] hover:text-[#111110]'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 ${(summary_stats?.exposure_count || 0) > 0 ? 'text-[#B91C1C]' : 'text-[#64635E]'}`} />
            <span>05 Exposures ({summary_stats?.exposure_count || 0})</span>
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
            {/* Search & Filter Bar */}
            <div className="bg-white border border-[#E5E4DE] p-4 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#64635E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  placeholder="Filter entities by label, value, type..."
                  className="w-full pl-9 pr-3 py-2 bg-[#FBFBFA] border border-[#E5E4DE] text-xs font-mono text-[#111110] placeholder-[#9E9D97] focus:outline-none focus:border-[#111110]"
                />
                {matrixSearch && (
                  <button
                    onClick={() => setMatrixSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#64635E] hover:text-[#111110]"
                  >
                    CLEAR
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-[#64635E] uppercase tracking-wider mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  <span>Type:</span>
                </span>
                {availableEntityTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setMatrixTypeFilter(type)}
                    className={`px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider transition-colors ${
                      matrixTypeFilter === type
                        ? 'bg-[#111110] text-[#C8FF00] font-bold'
                        : 'bg-[#F4F3EF] border border-[#E5E4DE] text-[#64635E] hover:text-[#111110]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#E5E4DE] shadow-subtle overflow-hidden">
              <div className="p-4 bg-[#FBFBFA] border-b border-[#E5E4DE] font-bold text-[#111110] flex justify-between items-center">
                <span>DISCOVERED ENTITIES ({filteredEntities.length} of {entities.length})</span>
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
                    {filteredEntities.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#64635E] font-mono">
                          No entities matching current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredEntities.map((ent) => (
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-[#E5E4DE] shadow-subtle overflow-hidden">
              <div className="p-4 bg-[#FBFBFA] border-b border-[#E5E4DE] font-bold text-[#111110] flex justify-between items-center">
                <span>CORRELATED RELATIONSHIPS ({filteredRelationships.length} of {relationships.length})</span>
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
                    {filteredRelationships.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-[#64635E] font-mono">
                          No relationships matching current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredRelationships.map((rel) => (
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TIMELINE VIEW */}
        {activeTab === 'timeline' && (
          <div className="max-w-3xl mx-auto space-y-6 font-mono text-xs">
            <div className="flex items-center justify-between text-xs font-mono text-[#64635E] uppercase tracking-wider pb-2 border-b border-[#E5E4DE]">
              <span>CHRONOLOGICAL RECONSTRUCTION OF DISCOVERED EVENTS</span>
              <span>{timelineEvents.length} KEY EVENTS</span>
            </div>

            <div className="relative border-l-2 border-[#E5E4DE] ml-4 space-y-6 py-2">
              {timelineEvents.map((evt) => {
                const isClickable = !!evt.entity;
                return (
                  <div key={evt.id} className="relative pl-7 group">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 transition-transform duration-200 ${
                        evt.category === 'INITIATION'
                          ? 'bg-[#C8FF00] border-[#111110]'
                          : evt.category === 'EXPOSURE'
                          ? 'bg-[#B91C1C] border-[#FFF1F2]'
                          : evt.category === 'COMPLETION'
                          ? 'bg-[#111110] border-[#C8FF00]'
                          : 'bg-[#111110] border-white group-hover:scale-125'
                      }`}
                    />

                    {/* Timeline Event Card */}
                    <div
                      onClick={() => {
                        if (evt.entity) {
                          handleSelectEntity(evt.entity);
                        }
                      }}
                      className={`bg-white border p-4 transition-all duration-150 ${
                        isClickable
                          ? 'border-[#E5E4DE] hover:border-[#111110] hover:shadow-subtle cursor-pointer'
                          : 'border-[#E5E4DE]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${evt.badgeColor}`}>
                          {evt.badge}
                        </span>
                        <span className="text-[11px] font-mono text-[#64635E] font-medium">
                          {evt.dateDisplay}
                        </span>
                      </div>

                      <div className="font-serif font-bold text-sm text-[#111110] mb-1">
                        {evt.title}
                      </div>

                      <p className="font-sans text-xs text-[#64635E] leading-relaxed">
                        {evt.description}
                      </p>

                      {isClickable && (
                        <div className="mt-3 pt-2 border-t border-[#E5E4DE] flex items-center justify-between text-[11px] text-[#111110] group-hover:text-black">
                          <span className="text-[10px] text-[#64635E] uppercase tracking-wider">
                            Inspect Evidentiary Provenance
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-xs text-[#111110] underline">
                            View Chain-of-Custody &rarr;
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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

        {/* TAB 5: PUBLIC EXPOSURES & BREACH INCIDENTS */}
        {activeTab === 'exposure' && (
          <div className="space-y-6 font-mono text-xs">
            <div className="bg-[#FFF1F2] border border-[#FECDD3] p-6 space-y-3">
              <div className="font-bold text-[#B91C1C] text-sm uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#B91C1C]" />
                PUBLIC SECURITY INCIDENT REPOSITORY
              </div>
              <p className="font-sans text-xs text-[#881337] leading-relaxed">
                Security incidents and data disclosure events are reported for historical risk awareness. The presence of an email in a public disclosure catalog proves an external third-party security incident occurred — it does not imply account compromise or personal culpability. Stolen plaintext passwords and exploit records are strictly excluded.
              </p>
            </div>

            {entities.filter((e) => e.entity_type === 'EXPOSURE_EVENT').length === 0 ? (
              <div className="bg-white border border-[#E5E4DE] p-12 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-[#111110] mx-auto opacity-70" />
                <div className="text-sm font-bold text-[#111110] uppercase">Zero Public Exposures Detected</div>
                <p className="font-sans text-xs text-[#64635E] max-w-md mx-auto">
                  No records matching &ldquo;{investigation.target_value}&rdquo; were found in our public security disclosure catalogs during this investigation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-[#64635E] uppercase tracking-wider">
                  Discovered Incident Disclosures ({entities.filter((e) => e.entity_type === 'EXPOSURE_EVENT').length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {entities
                    .filter((e) => e.entity_type === 'EXPOSURE_EVENT')
                    .map((item) => {
                      const dataClasses: string[] = item.attributes?.compromised_data_classes || [];
                      return (
                        <div
                          key={item.id}
                          className="bg-white border border-[#E5E4DE] hover:border-[#111110] p-6 space-y-4 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="text-[10px] text-[#B91C1C] uppercase font-bold tracking-wider">
                                {item.attributes?.breach_date || 'Historical Event'}
                              </div>
                              <h4 className="text-base font-serif font-bold text-[#111110]">
                                {item.attributes?.breach_title || item.display_label}
                              </h4>
                            </div>
                            <span className="px-2 py-0.5 bg-[#FFF1F2] border border-[#FECDD3] text-[#B91C1C] font-mono text-[10px] uppercase font-bold">
                              EXPOSURE EVENT
                            </span>
                          </div>

                          {item.attributes?.description && (
                            <p className="font-sans text-xs text-[#64635E] line-clamp-3 leading-relaxed">
                              {item.attributes.description.replace(/<[^>]*>?/gm, '')}
                            </p>
                          )}

                          {dataClasses.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-[#E5E4DE]">
                              <div className="text-[10px] text-[#64635E] uppercase font-bold">
                                Compromised Data Classes:
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {dataClasses.map((dc, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-[#FBFBFA] border border-[#E5E4DE] text-[10px] text-[#111110]"
                                  >
                                    {dc}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="pt-2 flex items-center justify-between border-t border-[#E5E4DE]">
                            <span className="text-[10px] text-[#64635E] uppercase">
                              Status: Unverified Link
                            </span>
                            <button
                              onClick={() => handleSelectEntity(item)}
                              className="text-xs text-[#111110] hover:underline font-semibold flex items-center gap-1"
                            >
                              <span>Inspect Provenance</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
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
