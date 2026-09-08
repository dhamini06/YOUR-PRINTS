import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[#E5E4DE] bg-white px-6 py-8 text-xs font-mono text-[#64635E] mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="text-[#111110] font-bold tracking-wider">YOUR-PRINTS</div>
          <div>DIGITAL FOOTPRINT INTELLIGENCE // EVIDENCE BEFORE INFERENCE</div>
          <div className="text-[11px] text-[#9E9D97] pt-1">
            Independent research platform. Public records only. Zero credential collection.
          </div>
        </div>

        <div className="flex flex-wrap gap-8 text-[11px]">
          <div>
            <div className="text-[#111110] font-semibold mb-2 uppercase">Platform</div>
            <ul className="space-y-1">
              <li><Link href="/" className="hover:text-[#111110]">Investigate Target</Link></li>
              <li><Link href="/methodology" className="hover:text-[#111110]">Forensic Methodology</Link></li>
              <li><Link href="/privacy" className="hover:text-[#111110]">Privacy & Opt-Out</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[#111110] font-semibold mb-2 uppercase">Confidence</div>
            <ul className="space-y-1">
              <li><span className="text-[#111110]">CONFIRMED</span> (Direct proof)</li>
              <li><span className="text-[#111110]">STRONG MATCH</span> (Corroborated)</li>
              <li><span className="text-[#111110]">POSSIBLE MATCH</span> (Uncorroborated)</li>
            </ul>
          </div>
          <div>
            <div className="text-[#111110] font-semibold mb-2 uppercase">Governance</div>
            <ul className="space-y-1">
              <li>48-Hour TTL Purge</li>
              <li>Zero Proxy Evasion</li>
              <li>RFC 5322 Standards</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-[#E5E4DE] mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#9E9D97]">
        <div>© 2026 YOUR-PRINTS. ALL RIGHTS RESERVED.</div>
        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
          <span>LAT.00 // LON.00</span>
          <span>SYS.RELEASE.v0.1</span>
        </div>
      </div>
    </footer>
  );
}
