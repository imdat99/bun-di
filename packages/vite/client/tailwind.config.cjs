/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                root: '#09090b',
                sub: '#18181b',
                header: 'rgba(24, 24, 27, 0.9)',
                border: '#27272a',
                accent: '#6366f1',
                'accent-hover': '#4f46e5',
                card: '#1f1f22',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            }
        },
    },
    plugins: [],
}
