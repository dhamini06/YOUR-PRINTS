'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Github, ExternalLink } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[#E5E4DE] px-6 py-4 flex items-center justify-between text-xs font-mono uppercase tracking-wider bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center space-x-6">
        <Link href="/" className="flex items-center space-x-2 group">
          <span className="w-2 h-2 rounded-full bg-[#C8FF00] border border-[#111110]/30 inline-block group-hover:scale-125 transition-transform"></span>
          <span className="font-bold tracking-widest text-[#111110]">YOUR-PRINTS</span>
        </Link>
        <span className="hidden sm:inline text-[#D6D5CD]">/</span>
        <span className="hidden sm:inline text-[#64635E] tracking-normal lowercase">digital footprint intelligence</span>
      </div>

      <nav className="flex items-center space-x-6 text-[#64635E]">
        <Link
          href="/"
          className={`transition-colors hover:text-[#111110] ${
            pathname === '/' ? 'text-[#111110] font-semibold underline underline-offset-4' : ''
          }`}
        >
          Investigate
        </Link>
        <Link
          href="/methodology"
          className={`transition-colors hover:text-[#111110] ${
            pathname === '/methodology' ? 'text-[#111110] font-semibold underline underline-offset-4' : ''
          }`}
        >
          Methodology
        </Link>
        <Link
          href="/privacy"
          className={`transition-colors hover:text-[#111110] ${
            pathname === '/privacy' ? 'text-[#111110] font-semibold underline underline-offset-4' : ''
          }`}
        >
          Privacy & Opt-Out
        </Link>
        <a
          href="https://github.com/dhamini06/YOUR-PRINTS"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center space-x-1 hover:text-[#111110] transition-colors"
        >
          <Github className="w-3.5 h-3.5" />
          <span>Source</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </a>
      </nav>
    </header>
  );
}
