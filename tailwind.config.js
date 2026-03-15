/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}" // Captures App.tsx, index.tsx, types.ts in root
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            colors: {
                brand: {
                    green: '#6BA06B',
                    'green-dark': '#4a7a4a',
                    'green-light': '#7fb87f',
                    mint: '#CDE8CD',
                    'mint-light': '#e8f5e8',
                    gold: '#D4AF37',
                    'gold-light': '#f0e4b8',
                    dark: '#1a2e1a',
                    'dark-light': '#2d4a2d',
                },
                sea: {
                    50:  'hsl(210, 40%, 96%)',
                    100: 'hsl(210, 35%, 91%)',
                    200: 'hsl(210, 30%, 82%)',
                    300: 'hsl(210, 28%, 70%)',
                    400: 'hsl(210, 30%, 55%)',
                    500: 'hsl(210, 45%, 40%)',
                    600: 'hsl(210, 50%, 32%)',
                    700: 'hsl(210, 55%, 25%)',
                    800: 'hsl(210, 60%, 18%)',
                    900: 'hsl(210, 65%, 11%)',
                    950: 'hsl(210, 70%, 7%)',
                },
                accent: {
                    50:  'hsl(175, 50%, 95%)',
                    100: 'hsl(175, 45%, 88%)',
                    200: 'hsl(175, 45%, 75%)',
                    300: 'hsl(175, 50%, 60%)',
                    400: 'hsl(175, 55%, 45%)',
                    500: 'hsl(175, 60%, 37%)',
                    600: 'hsl(175, 65%, 28%)',
                    700: 'hsl(175, 70%, 22%)',
                    800: 'hsl(175, 70%, 16%)',
                    900: 'hsl(175, 70%, 10%)',
                },
                surface: {
                    DEFAULT: 'hsl(210, 20%, 97%)',
                    raised:  'hsl(0, 0%, 100%)',
                    sunken:  'hsl(210, 20%, 94%)',
                    overlay: 'hsla(210, 65%, 11%, 0.6)',
                },
            },
            boxShadow: {
                'glass':      '0 4px 30px rgba(0, 0, 0, 0.06)',
                'glass-lg':   '0 8px 40px rgba(0, 0, 0, 0.08)',
                'card':       '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
                'card-hover': '0 4px 16px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
                'premium':    '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            },
            borderRadius: {
                '4xl': '2rem',
            },
            animation: {
                'fade-in':  'fadeIn 0.4s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'slide-in': 'slideIn 0.25s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%':   { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                scaleIn: {
                    '0%':   { opacity: '0', transform: 'scale(0.96)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideIn: {
                    '0%':   { opacity: '0', transform: 'translateX(16px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideUp: {
                    '0%':   { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
