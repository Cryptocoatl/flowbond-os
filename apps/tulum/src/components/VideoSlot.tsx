"use client";
// Higgsfield slot: the <video> lights itself via onLoadedData when the file
// exists; while absent it stays invisible (layers) or shows the placeholder
// children (reel). onError keeps the slot dark — no broken chrome.
import { useState, type ReactNode } from "react";

type Props = {
  src: string;
  layer?: boolean;       // absolute background layer (.vid-layer)
  dim?: boolean;         // dimmed ambient (opacity .35 when loaded)
  banner?: boolean;      // block banner revealed only when loaded (.slot-banner)
  className?: string;
  children?: ReactNode;  // placeholder content (e.g. the reel-empty card)
};

export default function VideoSlot({ src, layer, dim, banner, className, children }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const cls = [
    layer ? "vid-layer" : banner ? "slot-banner" : "",
    dim ? "dim" : "",
    loaded ? "loaded" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  return (
    <div className={cls} aria-hidden={layer || banner ? true : undefined}>
      {!failed && (
        <video
          autoPlay muted loop playsInline preload="metadata"
          onLoadedData={() => setLoaded(true)}
          onError={() => setFailed(true)}
        >
          <source src={src} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
        </video>
      )}
      {children}
    </div>
  );
}
