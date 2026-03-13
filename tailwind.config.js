/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── V11 Core Palette ──
        black: '#06080A',
        carbon: {
          0: '#0B0D10',
          1: '#12151A',
          2: '#1A1D24',
          3: '#22262E',
          4: '#2C3038',
        },
        bg: '#06080A',
        background: '#06080A',
        surface: {
          DEFAULT: '#0B0D10',
          2: '#12151A',
          3: '#1A1D24',
          4: '#22262E',
        },
        surfacehighlight: '#2C3038',
        surface2: '#12151A',
        surface3: '#1A1D24',

        // ── V11 Text Hierarchy ──
        steel: '#64748B',
        muted: '#78859B',
        subtle: '#94A3B8',
        dim: '#B0BEC5',
        light: '#CFD8DC',
        bright: '#E8EAED',
        primary: '#F1F3F5',
        secondary: '#CFD8DC',
        tertiary: '#94A3B8',
        quaternary: '#64748B',
        text: {
          primary: '#F1F3F5',
          secondary: '#CFD8DC',
          tertiary: '#94A3B8',
          quaternary: '#64748B',
          white: '#F1F3F5',
        },

        // ── Accent: Orange ──
        accent: {
          DEFAULT: '#F97316',
          primary: '#F97316',
          hover: '#FB923C',
          2: '#fb923c',
          dim: 'rgba(249,115,22,0.10)',
          glow: 'rgba(249,115,22,0.06)',
          muted: 'rgba(249,115,22,0.20)',
        },
        orange: '#F97316',

        // ── Semantic Colors ──
        'steel-dim': 'rgba(100,116,139,0.10)',
        positive: {
          DEFAULT: '#34D399',
          2: '#2BC48D',
        },
        negative: '#F87171',
        warning: '#FBBF24',
        driver: '#F97316',
        cool: '#F97316',
        rep: '#F97316',

        // ── Status ──
        status: {
          success: '#34D399',
          warning: '#FBBF24',
          danger: '#F87171',
          positive: '#34D399',
          negative: '#F87171',
        },

        // ── Badge Tier Metals ──
        gold: {
          DEFAULT: '#a8883e',
          h: '#c8a45a',
          m: '#a8883e',
          l: '#806828',
          high: '#c8a45a',
          mid: '#a8883e',
          low: '#806828',
        },
        silver: {
          DEFAULT: '#6a7688',
          h: '#909aaa',
          m: '#6a7688',
          l: '#4a5668',
          high: '#909aaa',
          mid: '#6a7688',
          low: '#4a5668',
        },
        bronze: {
          DEFAULT: '#7a6040',
          h: '#9a7a58',
          m: '#7a6040',
          l: '#5a4228',
          high: '#9a7a58',
          mid: '#7a6040',
          low: '#5a4228',
        },
        plat: {
          DEFAULT: '#706e90',
          h: '#8a88a8',
          m: '#706e90',
          l: '#585678',
          high: '#8a88a8',
          mid: '#706e90',
          low: '#585678',
        },

        // ── Category Colors (all orange in v3) ──
        cat: {
          spotter: '#F97316',
          social: '#F97316',
          builder: '#F97316',
          review: '#F97316',
          community: '#F97316',
        },
        'cat-spotter': '#F97316',
        'cat-social': '#F97316',
        'cat-builder': '#F97316',
        'cat-review': '#F97316',
        'cat-community': '#F97316',
      },
      fontFamily: {
        display: ['Rajdhani', 'system-ui', 'sans-serif'],
        heading: ['Rajdhani', 'system-ui', 'sans-serif'],
        body: ['Barlow', 'system-ui', 'sans-serif'],
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        cond: ['Barlow Condensed', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      letterSpacing: {
        'micro': '2.5px',
        'wider-2': '2px',
        'wider-3': '3px',
        'wider-4': '4px',
      },
      borderRadius: {
        'card': '14px',
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.035)',
        faint: 'rgba(255,255,255,0.035)',
        subtle: 'rgba(255,255,255,0.06)',
        soft: 'rgba(255,255,255,0.10)',
      },
      boxShadow: {
        'card': 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 12px rgba(0,0,0,0.35)',
        'card-hover': 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.4)',
        'glow-orange': '0 0 6px rgba(249,115,22,0.4)',
      },
      animation: {
        'page-enter': 'pageIn 0.35s cubic-bezier(.25,.46,.45,.94) forwards',
        'power-up': 'powerUp 0.45s cubic-bezier(.25,.46,.45,.94) forwards',
        'fade-up': 'fadeUp 0.3s ease forwards',
      },
      keyframes: {
        pageIn: {
          '0%': { opacity: '0', transform: 'translateX(24px)', filter: 'blur(3px)' },
          '50%': { filter: 'blur(0)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        powerUp: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
