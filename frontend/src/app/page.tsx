export default function HomePage() {
  return (
    <div className="flex-1 hairline-grid flex flex-col justify-center items-center px-6 py-16 relative">
      {/* Editorial corner markers */}
      <div className="absolute top-6 left-6 font-mono text-xs text-[#64635E] select-none">+ 00.1</div>
      <div className="absolute top-6 right-6 font-mono text-xs text-[#64635E] select-none">SYS.INIT +</div>
      <div className="absolute bottom-6 left-6 font-mono text-xs text-[#64635E] select-none">+ LAT.00</div>
      <div className="absolute bottom-6 right-6 font-mono text-xs text-[#64635E] select-none">LON.00 +</div>

      <div className="max-w-4xl w-full mx-auto flex flex-col items-start space-y-12">
        {/* Editorial Subhead */}
        <div className="flex items-center space-x-3 text-xs font-mono tracking-widest text-[#64635E] uppercase">
          <span className="w-1.5 h-1.5 bg-[#C8FF00] rounded-none"></span>
          <span>Digital Footprint Intelligence Platform</span>
          <span>—</span>
          <span>Foundation Active</span>
        </div>

        {/* Large Typography Editorial Headline */}
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif tracking-tight text-[#111110] leading-[0.95]">
            YOUR DIGITAL FOOTPRINT <br />
            <span className="italic font-normal">TELLS A BIGGER STORY.</span>
          </h1>
          <p className="text-lg md:text-xl text-[#64635E] font-sans max-w-2xl leading-relaxed pt-2">
            An open, evidence-based intelligence platform designed to discover, correlate, and forensically map public digital traces.
          </p>
        </div>

        {/* Foundation Card */}
        <div className="w-full bg-white border border-[#E5E4DE] p-8 shadow-subtle space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5E4DE] pb-4">
            <div className="font-mono text-xs uppercase tracking-wider text-[#111110] font-semibold flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-[#C8FF00] border border-[#111110]/30"></span>
              CORE ARCHITECTURE STATUS
            </div>
            <div className="font-mono text-xs text-[#64635E]">PHASE 0: VERIFIED</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
            <div className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-1">
              <div className="text-[#64635E]">BACKEND ENGINE</div>
              <div className="text-[#111110] font-semibold">FastAPI 0.110+ / Python 3.12</div>
              <div className="text-[11px] text-[#64635E]">Async Monolith Core</div>
            </div>
            <div className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-1">
              <div className="text-[#64635E]">DATA & PROVENANCE</div>
              <div className="text-[#111110] font-semibold">PostgreSQL 16 / SQLAlchemy 2.0</div>
              <div className="text-[11px] text-[#64635E]">Relational & Evidence Graphs</div>
            </div>
            <div className="p-4 bg-[#FBFBFA] border border-[#E5E4DE] space-y-1">
              <div className="text-[#64635E]">EDITORIAL FRONTEND</div>
              <div className="text-[#111110] font-semibold">Next.js 14 / TypeScript / Tailwind</div>
              <div className="text-[11px] text-[#64635E]">Three.js & D3.js Ready</div>
            </div>
          </div>

          <div className="pt-2 text-xs font-mono text-[#64635E] border-t border-[#E5E4DE] flex items-center justify-between">
            <span>CORE PHILOSOPHY: EVIDENCE BEFORE INFERENCE</span>
            <span className="text-[#111110]">STATUS: FOUNDATION READY FOR PHASE 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
