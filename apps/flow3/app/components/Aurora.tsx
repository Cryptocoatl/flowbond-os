// Drifting aurora light-blobs behind the content. Pure CSS, GPU-cheap.
export default function Aurora() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
      <div
        className="aurora-blob animate-aurora-slow"
        style={{
          width: '55vw',
          height: '55vw',
          top: '-18%',
          left: '-12%',
          background:
            'radial-gradient(circle, rgba(139,92,246,0.28) 0%, rgba(139,92,246,0) 70%)',
        }}
      />
      <div
        className="aurora-blob animate-aurora-mid"
        style={{
          width: '48vw',
          height: '48vw',
          bottom: '-20%',
          right: '-10%',
          background:
            'radial-gradient(circle, rgba(34,211,238,0.22) 0%, rgba(34,211,238,0) 70%)',
        }}
      />
      <div
        className="aurora-blob animate-aurora-slow"
        style={{
          width: '38vw',
          height: '38vw',
          top: '38%',
          left: '42%',
          background:
            'radial-gradient(circle, rgba(232,121,249,0.16) 0%, rgba(232,121,249,0) 70%)',
        }}
      />
    </div>
  );
}
