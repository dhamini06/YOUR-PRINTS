'use client';

import React, { useState } from 'react';
import { ArrowRight, Shield, CheckCircle2, EyeOff, Search, Loader2 } from 'lucide-react';
import { createInvestigation } from '@/lib/api';
import { Investigation } from '@/lib/types';

interface InvestigationInputProps {
  onInvestigatePreview?: (email: string) => void;
}

export default function InvestigationInput({ onInvestigatePreview }: InvestigationInputProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeInvestigation, setActiveInvestigation] = useState<Investigation | null>(null);

  // RFC 5322 compliant regex for client-side initial validation
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter a target email address.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid email address format (e.g. target@example.com).');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Connect to Phase 2 Investigation API endpoint
      const result = await createInvestigation(cleanEmail);
      setActiveInvestigation(result);

      if (onInvestigatePreview) {
        onInvestigatePreview(cleanEmail);
      }
    } catch (err: any) {
      // Fallback display if backend is offline in local preview mode
      setError(err.message || 'Failed to initialize investigation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stages = [
    { num: '01', title: 'TARGET VALIDATION', desc: 'Syntax, DNS records, MX mail server resolution' },
    { num: '02', title: 'PUBLIC SIGNAL DISCOVERY', desc: 'Gravatar profiles, domain RDAP, authorized registries' },
    { num: '03', title: 'IDENTITY CORRELATION', desc: 'Derived username pivoting, platform presence matching' },
    { num: '04', title: 'EXPOSURE ANALYSIS', desc: 'Public breach catalogs with masked attributes' },
    { num: '05', title: 'DIGITAL FOOTPRINT GRAPH', desc: 'Multi-factor confidence scoring and evidence linking' },
  ];

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-white border border-[#E5E4DE] shadow-subtle transition-all focus-within:border-[#111110]">
          <div className="flex items-center pl-4 pr-2 text-[#64635E]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
            placeholder="Enter an email address (e.g. target@domain.com)"
            className="flex-1 px-3 py-4 bg-transparent text-sm md:text-base font-mono text-[#111110] placeholder-[#9E9D97] focus:outline-none disabled:opacity-50"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-4 bg-[#111110] hover:bg-[#2A2A28] disabled:bg-[#64635E] text-white font-mono text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors group shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C8FF00]" />
                <span>Initializing...</span>
              </>
            ) : (
              <>
                <span>Investigate</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#C8FF00]" />
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-xs font-mono text-[#C5221F] flex items-center space-x-1.5">
            <span>✕</span>
            <span>{error}</span>
          </p>
        )}
      </form>

      {/* Trust & Methodology Micro-Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="flex items-center space-x-2 text-[11px] font-mono text-[#64635E]">
          <span className="w-1.5 h-1.5 bg-[#C8FF00] rounded-none inline-block"></span>
          <span>EVIDENCE FIRST</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-mono text-[#64635E]">
          <EyeOff className="w-3.5 h-3.5 text-[#64635E]" />
          <span>NO CREDENTIALS</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-mono text-[#64635E]">
          <Shield className="w-3.5 h-3.5 text-[#64635E]" />
          <span>EPHEMERAL 48H</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-mono text-[#64635E]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#64635E]" />
          <span>PUBLIC DATA ONLY</span>
        </div>
      </div>

      {/* Active Investigation Card: Real Backend API Result */}
      {activeInvestigation && (
        <div className="mt-8 p-6 bg-white border border-[#E5E4DE] shadow-subtle space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E4DE] pb-4 gap-2">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-[#64635E] uppercase tracking-widest">
                TARGET IDENTIFIER // {activeInvestigation.id}
              </div>
              <div className="font-mono text-base font-bold text-[#111110]">
                {activeInvestigation.target_value}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-[#C8FF00]/20 text-[#111110] border border-[#C8FF00]">
                STATUS: {activeInvestigation.status}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-[#F4F3EF] text-[#64635E] border border-[#E5E4DE]">
                STAGE: {activeInvestigation.current_stage}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-mono text-[#64635E] uppercase tracking-wider flex items-center justify-between">
              <span>Investigation Lifecycle Pipeline</span>
              <span className="text-[10px] text-[#111110]">ROOT ENTITY CREATED</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {stages.map((stage) => (
                <div
                  key={stage.num}
                  className={`p-3 border flex flex-col justify-between transition-colors ${
                    stage.num === '01'
                      ? 'bg-[#111110] text-white border-[#111110]'
                      : 'bg-[#FBFBFA] text-[#111110] border-[#E5E4DE]'
                  }`}
                >
                  <div
                    className={`font-mono text-[10px] font-semibold ${
                      stage.num === '01' ? 'text-[#C8FF00]' : 'text-[#64635E]'
                    }`}
                  >
                    {stage.num} {stage.num === '01' && '• ACTIVE'}
                  </div>
                  <div className="font-mono text-xs font-bold mt-1">{stage.title}</div>
                  <div
                    className={`font-sans text-[11px] mt-2 leading-tight ${
                      stage.num === '01' ? 'text-[#D6D5CD]' : 'text-[#64635E]'
                    }`}
                  >
                    {stage.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[#F4F3EF] border border-[#E5E4DE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center space-x-2 text-[#64635E]">
              <span className="w-2 h-2 rounded-full bg-[#C8FF00] border border-[#111110]/30"></span>
              <span>Investigation created & persisted in database. Ready for Phase 3 provider execution.</span>
            </div>
            <button
              onClick={() => {
                setActiveInvestigation(null);
                setEmail('');
              }}
              className="text-[#111110] underline font-semibold hover:text-[#64635E]"
            >
              Start New Investigation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
