module.exports = {
  content: ['./index.html', './assets/app.js'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        app: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        line: 'var(--border)',
        ink: 'var(--text)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        primary: {
          DEFAULT: 'var(--primary)',
          soft: 'var(--primary-soft)',
          dark: 'var(--primary-dark)'
        },
        danger: '#EF4444',
        warning: '#F59E0B'
      },
      boxShadow: {
        soft: '0 1px 2px rgba(20, 30, 24, 0.03), 0 12px 30px -24px rgba(20, 30, 24, 0.22)',
        lift: '0 18px 48px -24px rgba(12, 30, 22, 0.28)'
      },
      borderRadius: {
        '4xl': '26px'
      }
    }
  },
  plugins: []
};
