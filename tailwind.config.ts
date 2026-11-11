import type { Config } from "tailwindcss";

const c = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: c("background"),
        surface: c("surface"),
        "surface-muted": c("surface-muted"),
        foreground: c("foreground"),
        muted: c("muted"),
        border: c("border"),
        primary: { DEFAULT: c("primary"), hover: c("primary-hover"), soft: c("primary-soft"), fg: c("primary-fg") },
        success: { DEFAULT: c("success"), soft: c("success-soft") },
        warning: { DEFAULT: c("warning"), soft: c("warning-soft") },
        danger: { DEFAULT: c("danger"), soft: c("danger-soft") },
        info: { DEFAULT: c("info"), soft: c("info-soft") },
        sidebar: { DEFAULT: c("sidebar"), fg: c("sidebar-fg"), muted: c("sidebar-muted"), hover: c("sidebar-hover") },
      },
      borderColor: { DEFAULT: c("border") },
      borderRadius: { lg: "0.625rem", md: "0.5rem", sm: "0.375rem" },
      fontFamily: { sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"] },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-right": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "slide-in-left": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
        "pop-in": { from: { opacity: "0", transform: "translate(-50%,-48%) scale(.97)" }, to: { opacity: "1", transform: "translate(-50%,-50%) scale(1)" } },
        "pulse-soft": { "0%,100%": { opacity: "1" }, "50%": { opacity: ".5" } },
      },
      animation: {
        "fade-in": "fade-in .15s ease-out",
        "slide-in-right": "slide-in-right .2s ease-out",
        "slide-in-left": "slide-in-left .2s ease-out",
        "pop-in": "pop-in .15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
