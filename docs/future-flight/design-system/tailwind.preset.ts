import type { Config } from "tailwindcss";

/** Future Flight Tailwind preset — import into apps/future-flight/tailwind.config.ts.
 *  Colors mirror design-system/tokens.css so shadcn components inherit the brand. */
export const futureFlightPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        ff: {
          black: "#0D0D0F",
          charcoal: "#1A1A1D",
          "charcoal-2": "#232327",
          gold: "#D4AF37",
          copper: "#FFBA00",
          teal: "#0A3D3A",
          white: "#F2F2F2",
          muted: "rgba(242,242,242,0.62)",
        },
      },
      fontFamily: {
        display: ["Orbitron", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Montserrat", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        display: "0.24em",
        eyebrow: "0.34em",
      },
      borderRadius: { ff: "16px", "ff-lg": "22px" },
      boxShadow: {
        "ff-card":
          "inset 0 1px 0 rgba(255,255,255,0.03), 0 24px 60px -32px rgba(0,0,0,0.9)",
        "ff-portal":
          "0 0 60px -8px rgba(255,186,0,0.45), 0 0 140px -20px rgba(212,175,55,0.35)",
      },
      transitionTimingFunction: { ff: "cubic-bezier(0.22,1,0.36,1)" },
    },
  },
};

export default futureFlightPreset;
