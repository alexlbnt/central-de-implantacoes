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
        // Paleta Verde-limão / Oliva para ações, seleção e navegação lateral
        centi: {
          50: "#f8fbe9",   // Verde-limão ultra claro (superfície de seleção/hover)
          100: "#eff7cc",  // Verde-limão claro (badges sutis, seleção ativa)
          200: "#dfef9e",  // Verde-limão acento (bordas de seleção)
          300: "#cbe568",  // Verde-limão vivo (ícones, texto de destaque)
          400: "#b7d848",  // Verde-limão brilhante (anéis de foco, realces)
          500: "#A2BB40",  // Verde-limão oliva primário: #A2BB40 (RGB 162, 187, 64)
          600: "#A2BB40",  // Verde-limão oliva ações primárias: #A2BB40 (RGB 162, 187, 64)
          700: "#7e942e",  // Verde-oliva médio (ações reforçadas, contraste WCAG)
          800: "#5e6f24",  // Verde-oliva escuro (títulos, texto com ênfase)
          900: "#3f4c19",  // Verde-oliva profundo (cabeçalhos, botões executivos)
          950: "#18250e",  // Verde-oliva noturno (navegação lateral / sidebar)
        },
        // Mapeamento harmonizado de emerald para verde-limão/oliva em todo o sistema
        emerald: {
          50: "#f8fbe9",
          100: "#eff7cc",
          200: "#dfef9e",
          300: "#cbe568",
          400: "#b7d848",
          500: "#A2BB40",
          600: "#A2BB40",  // Substitui #059669 padrão do Tailwind diretamente por #A2BB40
          700: "#7e942e",
          800: "#5e6f24",
          900: "#3f4c19",
          950: "#18250e",
        },
        // Mapeamento harmonizado de green para verde-limão/oliva em todo o sistema
        green: {
          50: "#f8fbe9",
          100: "#eff7cc",
          200: "#dfef9e",
          300: "#cbe568",
          400: "#b7d848",
          500: "#A2BB40",
          600: "#A2BB40",  // Substitui #059669 ou similar diretamente por #A2BB40
          700: "#7e942e",
          800: "#5e6f24",
          900: "#3f4c19",
          950: "#18250e",
        },
        // Mapeamento harmonizado de teal para verde-oliva em todo o sistema
        teal: {
          50: "#f7f8f3",
          100: "#edf2e2",
          200: "#dbe5c5",
          300: "#c4d5a2",
          400: "#a5bf79",
          500: "#87a552",
          600: "#6c863e",
          700: "#546932",
          800: "#3f4f26",
          900: "#2b361a",
          950: "#17200f",
        },
        // Escala oliva complementar
        olive: {
          50: "#f7f8f3",
          100: "#edf2e2",
          200: "#dbe5c5",
          300: "#c4d5a2",
          400: "#a5bf79",
          500: "#87a552",
          600: "#6c863e",
          700: "#546932",
          800: "#3f4f26",
          900: "#2b361a",
          950: "#17200f",
        },
      },
    },
  },
  plugins: [],
};
export default config;
