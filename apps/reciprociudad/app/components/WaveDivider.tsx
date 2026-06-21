/** Ola SVG divider between sections. `d` is the wave path; `fill` the color of
 *  the section it flows into. `flip` mirrors it vertically (matches .wave.flip). */
export default function WaveDivider({
  d,
  fill,
  flip = false,
  marginTop,
}: {
  d: string;
  fill: string;
  flip?: boolean;
  marginTop?: number;
}) {
  return (
    <svg
      className={`wave${flip ? ' flip' : ''}`}
      viewBox="0 0 1440 90"
      preserveAspectRatio="none"
      style={marginTop ? { marginTop } : undefined}
      aria-hidden="true"
    >
      <path d={d} fill={fill} />
    </svg>
  );
}
