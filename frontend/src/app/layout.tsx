import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YOUR-PRINTS | Digital Footprint Intelligence',
  description: 'Evidence-based open source digital footprint intelligence platform. Discover, normalize, and forensically map public digital traces.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#FBFBFA] text-[#111110]">
      <body className="min-h-screen flex flex-col font-sans selection:bg-[#C8FF00] selection:text-[#111110]">
        <header className="border-b border-[#E5E4DE] px-6 py-4 flex items-center justify-between text-xs font-mono uppercase tracking-wider bg-white/70 backdrop-blur-sm sticky top-0 z-50">
          <div className="flex items-center space-x-3">
            <span className="w-2 h-2 rounded-full bg-[#C8FF00] border border-[#111110]/20 inline-block"></span>
            <span className="font-bold tracking-widest text-[#111110]">YOUR-PRINTS</span>
            <span className="text-[#64635E]">/</span>
            <span className="text-[#64635E]">SYS.CORE.v0.1</span>
          </div>
          <div className="flex items-center space-x-6 text-[#64635E]">
            <span>PHASE 0: FOUNDATION</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-[#EFEFEA] text-[#111110] font-mono">
              EVIDENCE FIRST
            </span>
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="border-t border-[#E5E4DE] px-6 py-4 text-xs font-mono text-[#64635E] flex flex-col md:flex-row items-center justify-between gap-2">
          <div>YOUR-PRINTS // DIGITAL FOOTPRINT INTELLIGENCE</div>
          <div>EVIDENCE BEFORE INFERENCE</div>
        </footer>
      </body>
    </html>
  );
}
