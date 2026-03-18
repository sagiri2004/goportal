/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background:    'rgb(var(--background) / <alpha-value>)',
        surface:       'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        primary:       'rgb(var(--primary) / <alpha-value>)',
        'primary-hover': 'rgb(var(--primary-hover) / <alpha-value>)',
        success:       'rgb(var(--success) / <alpha-value>)',
        danger:        'rgb(var(--danger) / <alpha-value>)',
        warning:       'rgb(var(--warning) / <alpha-value>)',
        foreground:    'rgb(var(--foreground) / <alpha-value>)',
        muted:         'rgb(var(--muted) / <alpha-value>)',
        subtle:        'rgb(var(--subtle) / <alpha-value>)',
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
        md: '8px',
        lg: '12px',
      },
    },
  },
  plugins: [],
}
