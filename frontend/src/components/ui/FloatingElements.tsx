export function FloatingBackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Primary Violet-Cyan Floating Orb */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 animate-float-slow"
        style={{
          top: '-100px',
          left: '15%',
          background: 'radial-gradient(circle, #7C3AED 0%, #06B6D4 60%, transparent 80%)',
        }}
      />

      {/* Secondary Pink-Purple Floating Orb */}
      <div
        className="absolute w-[450px] h-[450px] rounded-full blur-[130px] opacity-15 animate-float-reverse"
        style={{
          bottom: '10%',
          right: '5%',
          background: 'radial-gradient(circle, #EC4899 0%, #7C3AED 60%, transparent 80%)',
        }}
      />

      {/* Subtle Emerald Pulse Orb */}
      <div
        className="absolute w-[350px] h-[350px] rounded-full blur-[110px] opacity-10 animate-pulse-glow"
        style={{
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, #10B981 0%, #06B6D4 60%, transparent 80%)',
        }}
      />
    </div>
  );
}

export function FloatingLiveBeacon() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-xs text-violet-300 backdrop-blur-md animate-float-medium shadow-[0_0_15px_rgba(124,58,237,0.2)]">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="font-medium tracking-wide">ENTERPRISE LEDGER • WEBSOCKET SYNC</span>
    </div>
  );
}
