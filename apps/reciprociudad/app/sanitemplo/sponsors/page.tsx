import SponsorsSurface from '@/app/components/sanitemplo/SponsorsSurface';

// La superficie es una isla de cliente (tabulador vivo). El 3D llega en su propia
// isla (fase 5); esta página vende completa aunque no haya WebGL.
export default function SponsorsPage() {
  return <SponsorsSurface />;
}
