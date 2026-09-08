import React from 'react';
import Link from 'next/link';
import IdentityCore from '@/components/3d/IdentityCore';
import InvestigationInput from '@/components/investigation/InvestigationInput';
import { ArrowUpRight, ShieldCheck, Database, GitFork, Lock, Network, FileCheck2, Cpu } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 hairline-grid flex flex-col">
      {/* ========================================================================= */}
      {/* HERO SECTION: Editorial Headline + 3D Biometric Signal Centerpiece */}
      {/* ========================================================================= */}
      <section className="relative px-6 py-12 md:py-20 border-b border-[#E5E4DE] overflow-hidden">
        {/* Subtle coordinate markers */}
        <div className="absolute top-6 left-6 font-mono text-[10px] text-[#64635E] select-none">+ 00.1 // LAT.40</div>
        <div className="absolute top-6 right-6 font-mono text-[10px] text-[#64635E] select-none">SYS.ACTIVE // LON.74 +</div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column (Editorial Headline + Form) */}
          <div className="lg:col-span-7 space-y-8 z-10">
            {/* Editorial Subtitle Tag */}
            <div className="inline-flex items-center space-x-2.5 px-3 py-1 bg-white border border-[#E5E4DE] text-[11px] font-mono tracking-widest text-[#111110] uppercase shadow-subtle">
              <span className="w-1.5 h-1.5 bg-[#C8FF00] border border-[#111110]/30 inline-block"></span>
              <span>Digital Footprint Intelligence</span>
              <span className="text-[#64635E]">/</span>
              <span className="text-[#64635E]">Evidence-First Platform</span>
            </div>

            {/* Giant Editorial Serif Headline */}
            <div className="space-y-3">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif tracking-tight text-[#111110] leading-[0.92]">
                YOUR DIGITAL FOOTPRINT <br />
                <span className="italic font-normal text-[#111110]/90">TELLS A BIGGER STORY.</span>
              </h1>
              <p className="text-base sm:text-lg text-[#64635E] font-sans max-w-xl leading-relaxed pt-2">
                Discover, normalize, and forensically map the public traces associated with an email address. No credential dumps. No unverified assumptions. Evidence before inference.
              </p>
            </div>

            {/* Investigation Input Form */}
            <div className="pt-2">
              <InvestigationInput />
            </div>
          </div>

          {/* Right Column (3D Sculptural Identity Centerpiece) */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[420px] lg:min-h-[520px]">
            <div className="w-full h-full max-w-[480px] aspect-square relative">
              <IdentityCore className="w-full h-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 1: The Anatomy of an Evidence-Based Investigation */}
      {/* ========================================================================= */}
      <section className="px-6 py-16 md:py-24 bg-white border-b border-[#E5E4DE]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E5E4DE] pb-6">
            <div className="space-y-2">
              <div className="font-mono text-xs uppercase tracking-widest text-[#64635E]">
                01 // SIGNAL TAXONOMY
              </div>
              <h2 className="text-3xl md:text-4xl font-serif text-[#111110]">
                What Legitimate Signals Can Be Discovered?
              </h2>
            </div>
            <p className="font-mono text-xs text-[#64635E] max-w-md">
              The platform queries only authoritative, publicly accessible protocols and open APIs. Every signal preserves its raw source headers and discovery timestamp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 bg-[#FBFBFA] border border-[#E5E4DE] space-y-4 hover:border-[#111110] transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#64635E]">01.01</span>
                <Database className="w-4 h-4 text-[#111110]" />
              </div>
              <h3 className="font-serif text-xl text-[#111110]">Target & Mail Integrity</h3>
              <p className="font-sans text-xs text-[#64635E] leading-relaxed">
                RFC 5322 normalization, domain MX records, DNS TXT, SPF/DMARC metadata, and ICANN RDAP registration details.
              </p>
              <div className="pt-2 font-mono text-[10px] text-[#111110] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1 h-1 bg-[#C8FF00]"></span>
                <span>Direct DNS & ICANN</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-6 bg-[#FBFBFA] border border-[#E5E4DE] space-y-4 hover:border-[#111110] transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#64635E]">01.02</span>
                <Cpu className="w-4 h-4 text-[#111110]" />
              </div>
              <h3 className="font-serif text-xl text-[#111110]">Public Profile Correlation</h3>
              <p className="font-sans text-xs text-[#64635E] leading-relaxed">
                Public avatars (Gravatar SHA-256), derived usernames, and authorized profile endpoints across public developer platforms.
              </p>
              <div className="pt-2 font-mono text-[10px] text-[#111110] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1 h-1 bg-[#C8FF00]"></span>
                <span>Public REST APIs</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-6 bg-[#FBFBFA] border border-[#E5E4DE] space-y-4 hover:border-[#111110] transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#64635E]">01.03</span>
                <FileCheck2 className="w-4 h-4 text-[#111110]" />
              </div>
              <h3 className="font-serif text-xl text-[#111110]">Cryptographic Identity</h3>
              <p className="font-sans text-xs text-[#64635E] leading-relaxed">
                Public Keybase identity proofs, PGP public keys, published domain ownership records, and verified author profiles.
              </p>
              <div className="pt-2 font-mono text-[10px] text-[#111110] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1 h-1 bg-[#C8FF00]"></span>
                <span>Cryptographic Proofs</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-6 bg-[#FBFBFA] border border-[#E5E4DE] space-y-4 hover:border-[#111110] transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#64635E]">01.04</span>
                <ShieldCheck className="w-4 h-4 text-[#111110]" />
              </div>
              <h3 className="font-serif text-xl text-[#111110]">Public Exposure Status</h3>
              <p className="font-sans text-xs text-[#64635E] leading-relaxed">
                Historical public breach catalog indicators, disclosure dates, and compromised data classes — strictly without plaintext credentials.
              </p>
              <div className="pt-2 font-mono text-[10px] text-[#111110] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1 h-1 bg-[#C8FF00]"></span>
                <span>Authorized Registries</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: Core Philosophy: Evidence Before Inference */}
      {/* ========================================================================= */}
      <section className="px-6 py-16 md:py-24 border-b border-[#E5E4DE] hairline-grid">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="font-mono text-xs uppercase tracking-widest text-[#64635E]">
              02 // CORE PHILOSOPHY
            </div>
            <h2 className="text-3xl md:text-4xl font-serif text-[#111110] leading-tight">
              An Observation Is a Fact. <br />
              <span className="italic">An Association Is an Inference.</span>
            </h2>
            <p className="text-sm font-sans text-[#64635E] leading-relaxed">
              Most search aggregators dump uncorroborated hits into disconnected cards, encouraging premature conclusions. If an email prefix matches a GitHub username, they present them as the same person.
            </p>
            <p className="text-sm font-sans text-[#64635E] leading-relaxed">
              YOUR-PRINTS enforces forensic rigor: an observation is preserved as an immutable record, and the relationship to the target is classified transparently into distinct confidence tiers.
            </p>
            <div className="pt-2">
              <Link
                href="/methodology"
                className="inline-flex items-center space-x-2 font-mono text-xs uppercase tracking-wider text-[#111110] hover:text-[#64635E] underline underline-offset-4"
              >
                <span>Read the Epistemological Whitepaper</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E5E4DE] p-8 shadow-subtle space-y-6">
            <div className="font-mono text-xs uppercase tracking-wider text-[#111110] border-b border-[#E5E4DE] pb-3 flex justify-between">
              <span>Three-Tier Epistemological Model</span>
              <span className="text-[#64635E]">EVALUATION ENGINE</span>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-1">
                <div className="font-mono text-xs font-bold text-[#111110] flex items-center justify-between">
                  <span>TIER A: SOURCE OBSERVATION RELIABILITY</span>
                  <span className="text-[10px] text-[#64635E]">DEFINITIVE / RELIABLE</span>
                </div>
                <p className="text-xs text-[#64635E]">
                  Evaluates whether the collected HTTP/DNS probe is technically authoritative and uncorrupted.
                </p>
              </div>

              <div className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-1">
                <div className="font-mono text-xs font-bold text-[#111110] flex items-center justify-between">
                  <span>TIER B: RELATIONSHIP COUPLING STRENGTH</span>
                  <span className="text-[10px] text-[#64635E]">DIRECT / CORROBORATED / UNCORROBORATED</span>
                </div>
                <p className="text-xs text-[#64635E]">
                  Evaluates whether the discovered entity is bound to the target by exact email match, secondary metadata overlap, or merely a shared username.
                </p>
              </div>

              <div className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-1">
                <div className="font-mono text-xs font-bold text-[#111110] flex items-center justify-between">
                  <span>TIER C: IDENTITY CLAIM STATUS</span>
                  <span className="text-[10px] text-[#C8FF00] bg-[#111110] px-1.5 py-0.5">FINAL LABEL</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono">
                  <span className="p-1.5 bg-white border border-[#E5E4DE] text-[#111110]">CONFIRMED</span>
                  <span className="p-1.5 bg-white border border-[#E5E4DE] text-[#111110]">STRONG MATCH</span>
                  <span className="p-1.5 bg-white border border-[#E5E4DE] text-[#64635E]">POSSIBLE MATCH</span>
                  <span className="p-1.5 bg-white border border-[#E5E4DE] text-[#9E9D97]">UNVERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: Forensic Contrast Matrix */}
      {/* ========================================================================= */}
      <section className="px-6 py-16 md:py-24 bg-white border-b border-[#E5E4DE]">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="space-y-2">
            <div className="font-mono text-xs uppercase tracking-widest text-[#64635E]">
              03 // METHODOLOGICAL COMPARISON
            </div>
            <h2 className="text-3xl md:text-4xl font-serif text-[#111110]">
              Why YOUR-PRINTS Is Different
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border border-[#E5E4DE]">
              <thead className="bg-[#FBFBFA] border-b border-[#E5E4DE] text-[#111110]">
                <tr>
                  <th className="p-4 uppercase tracking-wider font-semibold">Architectural Dimension</th>
                  <th className="p-4 uppercase tracking-wider text-[#64635E]">Conventional OSINT Aggregators</th>
                  <th className="p-4 uppercase tracking-wider text-[#111110] bg-[#C8FF00]/10 border-l border-r border-[#C8FF00]/40">
                    YOUR-PRINTS Platform
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E4DE] font-sans">
                <tr>
                  <td className="p-4 font-mono font-semibold text-[#111110]">Output Structure</td>
                  <td className="p-4 text-[#64635E]">Disconnected cards with unverified search hits</td>
                  <td className="p-4 text-[#111110] bg-[#C8FF00]/5 border-l border-r border-[#C8FF00]/30 font-medium">
                    Structured intelligence graph with semantic links and provenance
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-mono font-semibold text-[#111110]">Confidence & Inference</td>
                  <td className="p-4 text-[#64635E]">Assumes matching username equals the same human</td>
                  <td className="p-4 text-[#111110] bg-[#C8FF00]/5 border-l border-r border-[#C8FF00]/30 font-medium">
                    Evidence before inference: strict dictionary penalties and corroboration
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-mono font-semibold text-[#111110]">Credential Handling</td>
                  <td className="p-4 text-[#64635E]">Often indexes and displays stolen plaintext passwords</td>
                  <td className="p-4 text-[#111110] bg-[#C8FF00]/5 border-l border-r border-[#C8FF00]/30 font-medium">
                    Strict zero-credential policy: breach indicators only, no secrets
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-mono font-semibold text-[#111110]">Provider Compliance</td>
                  <td className="p-4 text-[#64635E]">Attempts proxy rotation and anti-bot evasion</td>
                  <td className="p-4 text-[#111110] bg-[#C8FF00]/5 border-l border-r border-[#C8FF00]/30 font-medium">
                    Respects upstream rate limits and policies; isolates provider failures
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-mono font-semibold text-[#111110]">Data Retention</td>
                  <td className="p-4 text-[#64635E]">Indefinite caching and commercial data harvesting</td>
                  <td className="p-4 text-[#111110] bg-[#C8FF00]/5 border-l border-r border-[#C8FF00]/30 font-medium">
                    Ephemeral 48h TTL with immediate user deletion and opt-out registry
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: Ethical Safeguards & Right to Erasure */}
      {/* ========================================================================= */}
      <section className="px-6 py-16 md:py-24 border-b border-[#E5E4DE] hairline-grid">
        <div className="max-w-4xl mx-auto space-y-8 text-center flex flex-col items-center">
          <div className="inline-flex items-center space-x-2 font-mono text-xs uppercase tracking-widest text-[#64635E]">
            <Lock className="w-3.5 h-3.5 text-[#111110]" />
            <span>RESPONSIBLE OSINT & PRIVACY GOVERNANCE</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-serif text-[#111110] leading-tight">
            Designed for Transparency. <br />
            <span className="italic">Built to Prevent Abuse.</span>
          </h2>

          <p className="text-sm md:text-base text-[#64635E] max-w-2xl leading-relaxed">
            YOUR-PRINTS processes only legitimate public information. We do not support private account intrusions, credential scraping, or unauthorized access. Email owners can inspect, delete, or permanently opt out their target identifiers.
          </p>

          <div className="flex flex-wrap gap-4 justify-center pt-4 font-mono text-xs">
            <Link
              href="/privacy"
              className="px-6 py-3 bg-[#111110] text-white hover:bg-[#2A2A28] transition-colors uppercase tracking-wider"
            >
              Opt-Out Registry & Privacy
            </Link>
            <Link
              href="/methodology"
              className="px-6 py-3 bg-white border border-[#E5E4DE] text-[#111110] hover:border-[#111110] transition-colors uppercase tracking-wider"
            >
              View Forensic Standards
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
