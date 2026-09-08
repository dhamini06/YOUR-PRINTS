'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PrivacyPage() {
  const [optOutEmail, setOptOutEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!optOutEmail.includes('@') || !optOutEmail.includes('.')) {
      setError('Please enter a valid email address to request exclusion.');
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <div className="flex-1 hairline-grid px-6 py-12 md:py-20">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 font-mono text-xs text-[#64635E] hover:text-[#111110] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO INVESTIGATION</span>
          </Link>
        </div>

        {/* Header */}
        <div className="space-y-4 border-b border-[#E5E4DE] pb-8">
          <div className="font-mono text-xs text-[#64635E] uppercase tracking-widest">
            PRIVACY GOVERNANCE & RIGHT TO ERASURE
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#111110] leading-tight">
            Privacy Policy & <br />
            <span className="italic font-normal">Target Opt-Out Registry</span>
          </h1>
          <p className="text-base text-[#64635E] font-sans leading-relaxed max-w-2xl">
            YOUR-PRINTS is committed to responsible, non-invasive digital footprint intelligence. We enforce strict data retention limits and provide a permanent opt-out mechanism for target identifiers.
          </p>
        </div>

        {/* Opt-Out Registry Interactive Card */}
        <div className="bg-white border border-[#E5E4DE] p-8 shadow-subtle space-y-6">
          <div className="space-y-2">
            <div className="font-mono text-xs text-[#111110] font-bold uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#111110]" />
              PERMANENT OPT-OUT REGISTRY
            </div>
            <p className="text-xs text-[#64635E] leading-relaxed">
              If you own an email address and wish to permanently block it from being queried by public visitors on YOUR-PRINTS, enter it below.
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleOptOut} className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <input
                  type="email"
                  value={optOutEmail}
                  onChange={(e) => setOptOutEmail(e.target.value)}
                  placeholder="Enter your email address to opt out"
                  className="flex-1 px-4 py-3 bg-[#FBFBFA] border border-[#E5E4DE] font-mono text-xs text-[#111110] placeholder-[#9E9D97] focus:outline-none focus:border-[#111110]"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#111110] text-white hover:bg-[#2A2A28] font-mono text-xs uppercase tracking-wider shrink-0 transition-colors"
                >
                  Submit Opt-Out Request
                </button>
              </div>

              {error && (
                <p className="text-xs font-mono text-[#C5221F] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </p>
              )}

              <p className="text-[11px] font-mono text-[#64635E]">
                * To prevent unauthorized blocking of third-party domains, an automated verification token is sent to the address to verify ownership before blacklisting.
              </p>
            </form>
          ) : (
            <div className="p-4 bg-[#F4F3EF] border border-[#E5E4DE] space-y-2 text-xs font-mono">
              <div className="text-[#111110] font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#111110]" />
                VERIFICATION REQUEST RECORDED (PHASE 1 PREVIEW)
              </div>
              <p className="text-[#64635E]">
                In Phase 3 API implementation, a confirmation link will be dispatched to <span className="font-semibold text-[#111110]">{optOutEmail}</span>. Upon confirmation, its cryptographic SHA-256 hash is added to the permanent exclusion registry.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setOptOutEmail('');
                }}
                className="text-[#111110] underline pt-1 font-semibold"
              >
                Submit another request
              </button>
            </div>
          )}
        </div>

        {/* Governance Principles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          <div className="p-6 bg-white border border-[#E5E4DE] space-y-3">
            <div className="text-[#111110] font-bold uppercase">48-Hour Ephemeral Retention</div>
            <p className="font-sans text-xs text-[#64635E] leading-relaxed">
              All investigation records, discovered entities, relationships, and raw evidence payloads automatically expire and are purged from our database 48 hours after execution.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#E5E4DE] space-y-3">
            <div className="text-[#111110] font-bold uppercase">Immediate Hard Deletion</div>
            <p className="font-sans text-xs text-[#64635E] leading-relaxed">
              Every completed investigation view features an immediate &ldquo;Delete Investigation Now&rdquo; action that triggers instant deletion of all graph nodes, edges, and evidence records.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#E5E4DE] space-y-3">
            <div className="text-[#111110] font-bold uppercase">Zero Stolen Credentials</div>
            <p className="font-sans text-xs text-[#64635E] leading-relaxed">
              YOUR-PRINTS does not index, store, or display passwords, hashes, cleartext secrets, or private leak dumps. Exposure analysis reports only public breach catalog labels and dates.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#E5E4DE] space-y-3">
            <div className="text-[#111110] font-bold uppercase">Zero Client Secret Leakage</div>
            <p className="font-sans text-xs text-[#64635E] leading-relaxed">
              All upstream third-party tokens and backend API credentials remain strictly confined to the backend server. The browser bundle receives zero external credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
