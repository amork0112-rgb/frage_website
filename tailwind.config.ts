import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        frage: {
          blue: "#3B82F6", // Bright Royal Blue
          purple: "#5B21B6", // Deep Elegant Purple (Updated)
          yellow: "#FBBF24", // Sunflower Yellow
          green: "#34D399", // Fresh Green
          navy: "#1E3A8A", // Deep Blue for contrast
          cream: "#FFFBEB", // Very light yellow-white
          gray: "#475569", // Slate Gray
          gold: "#F59E0B", // Amber (replaces metallic gold)
        },
      },
      fontFamily: {
        serif: ["var(--font-nunito)", "var(--font-noto-sans-kr)", "sans-serif"],
        sans: ["var(--font-nunito)", "var(--font-noto-sans-kr)", "sans-serif"],
        kr: ["var(--font-noto-sans-kr)", "sans-serif"],
        montserrat: ["var(--font-montserrat)", "sans-serif"],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'slow-zoom': 'zoom 20s infinite alternate',
        'fade-in-up': 'fadeInUp 1s ease-out forwards',
        'bounce-slow': 'bounce 3s infinite',
      },
      keyframes: {
        zoom: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.1)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
