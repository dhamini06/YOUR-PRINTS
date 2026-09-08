import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, CheckCircle, AlertTriangle, FileCode } from 'lucide-react';

export default function MethodologyPage() {
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
            METHODOLOGICAL WHITEPAPER // REF.2026.01
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#111110] leading-tight">
            Evidence Before Inference: <br />
            <span className="italic font-normal">The Epistemology of Digital Footprints</span>
          </h1>
          <p className="text-base text-[#64635E] font-sans leading-relaxed max-w-2xl">
            A technical breakdown of how YOUR-PRINTS transforms raw internet observations into structured intelligence without fabricating identity claims.
          </p>
        </div>

        {/* Core Sections */}
        <div className="space-y-12 font-sans text-sm md:text-base text-[#111110] leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-serif text-[#111110]">1. The False Identity Trap in Conventional OSINT</h2>
            <p className="text-[#64635E]">
              Traditional open-source intelligence tools typically adopt a brute-force approach: given an email address like <code className="font-mono text-xs bg-[#F4F3EF] px-1.5 py-0.5 border border-[#E5E4DE]">alex@company.com</code>, they extract the prefix <code className="font-mono text-xs bg-[#F4F3EF] px-1.5 py-0.5 border border-[#E5E4DE]">alex</code> and scrape hundreds of platform endpoints to see if that username exists. When an endpoint returns HTTP 200, the tool renders a card implying the target owns that account.
            </p>
            <p className="text-[#64635E]">
              This heuristic is fundamentally flawed. On large platforms like GitHub, Reddit, or Steam, short and common usernames were claimed decades ago by different individuals. Treating a shared username as proof of identity introduces severe false positive rates that compromise analytical credibility.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4 bg-white border border-[#E5E4DE] p-6 shadow-subtle">
            <h2 className="text-2xl font-serif text-[#111110]">2. The Three-Tier Epistemological Matrix</h2>
            <p className="text-[#64635E]">
              YOUR-PRINTS separates intelligence evaluation into three distinct layers:
            </p>

            <div className="space-y-4 font-mono text-xs pt-2">
              <div className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-1">
                <div className="text-[#111110] font-bold">TIER A: OBSERVATION CONFIDENCE</div>
                <div className="text-[#64635E]">
                  Evaluates the technical fidelity of the query. Was the response received from an authoritative DNS resolver, an official REST API endpoint, or an indirect web mirror?
                </div>
              </div>

              <div className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-1">
                <div className="text-[#111110] font-bold">TIER B: RELATIONSHIP COUPLING</div>
                <div className="text-[#64635E]">
                  Evaluates how strongly the entity connects to the investigation root. An exact email match in a public payload yields direct coupling; a matching username without corroboration yields uncorroborated coupling.
                </div>
              </div>

              <div className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-1">
                <div className="text-[#111110] font-bold">TIER C: IDENTITY CLAIM STATUS</div>
                <div className="text-[#64635E]">
                  The final classification presented to the user:
                </div>
                <ul className="list-disc list-inside pt-2 space-y-1 text-[#111110]">
                  <li><strong className="text-[#111110]">CONFIRMED ASSOCIATION</strong>: Exact email present in public record or verified cryptographic proof.</li>
                  <li><strong className="text-[#111110]">STRONG MATCH</strong>: Matching username corroborated by matching full name, avatar perceptual hash, or domain backlinks.</li>
                  <li><strong className="text-[#111110]">POSSIBLE MATCH</strong>: Unique username match without secondary corroboration.</li>
                  <li><strong className="text-[#64635E]">WEAK SIGNAL</strong>: Common dictionary username subject to collision penalties.</li>
                  <li><strong className="text-[#9E9D97]">UNVERIFIED</strong>: Third-party historical indicator that cannot be inspected independently.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-serif text-[#111110]">3. Semantic Separation of Infrastructure & Personhood</h2>
            <p className="text-[#64635E]">
              When an investigation discovers that an email is hosted on <code className="font-mono text-xs bg-[#F4F3EF] px-1.5 py-0.5 border border-[#E5E4DE]">aspmx.l.google.com</code>, conventional tools often resolve the IP address, look up its geolocation, and display the coordinates of Google&apos;s data center as if it were the target&apos;s physical location.
            </p>
            <p className="text-[#64635E]">
              YOUR-PRINTS explicitly models technical relationships as distinct semantic categories:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 bg-white border border-[#E5E4DE]">
                <div className="text-[#111110] font-semibold">PROVIDED_BY</div>
                <div className="text-[#64635E] text-[11px] mt-1">Identifies mail infrastructure provider (e.g. ProtonMail, Fastmail, Google Workspace).</div>
              </div>
              <div className="p-3 bg-white border border-[#E5E4DE]">
                <div className="text-[#111110] font-semibold">HOSTED_ON</div>
                <div className="text-[#64635E] text-[11px] mt-1">Identifies DNS nameservers or domain registrars.</div>
              </div>
              <div className="p-3 bg-white border border-[#E5E4DE]">
                <div className="text-[#111110] font-semibold">POSSIBLE_ACCOUNT</div>
                <div className="text-[#64635E] text-[11px] mt-1">Represents a public platform account requiring independent verification.</div>
              </div>
              <div className="p-3 bg-white border border-[#E5E4DE]">
                <div className="text-[#111110] font-semibold">REPORTED_IN</div>
                <div className="text-[#64635E] text-[11px] mt-1">Identifies public historical exposure events with masked attributes.</div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-serif text-[#111110]">4. Respect for Provider Policies & Upstream Rate Limits</h2>
            <p className="text-[#64635E]">
              YOUR-PRINTS does not use egress proxy rotation, residential proxy networks, or header spoofing to bypass upstream rate limits or anti-bot protections. If an external service returns HTTP 429 or 403, the platform adheres to upstream policy, backs off, marks that provider as unavailable, and cleanly proceeds with remaining sources.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-4 border-t border-[#E5E4DE] pt-8">
            <div className="flex items-center justify-between text-xs font-mono text-[#64635E]">
              <span>YOUR-PRINTS RESEARCH WORKING PAPER</span>
              <span>VERSION 1.0</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
