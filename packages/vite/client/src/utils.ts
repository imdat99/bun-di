export const PRISM_LANG_ALIASES: Record<string, string> = {
  // JS ecosystem
  js: 'javascript',
  javascript: 'javascript',
  node: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  tsx: 'tsx',
  jsx: 'jsx',

  // Web
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',

  // Backend
  py: 'python',
  python: 'python',
  rb: 'ruby',
  ruby: 'ruby',
  php: 'php',
  java: 'java',
  kt: 'kotlin',
  go: 'go',
  rs: 'rust',
  rust: 'rust',

  // Shell / config
  sh: 'bash',
  shell: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'bash',

  yml: 'yaml',
  yaml: 'yaml',
  json: 'json',
  toml: 'toml',
  ini: 'ini',
  env: 'ini',

  // Data / misc
  sql: 'sql',
  graphql: 'graphql',
  md: 'markdown',
  markdown: 'markdown',

  // C-family
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  csharp: 'csharp',

  // Fallback
  plaintext: 'plaintext',
  text: 'plaintext',
  txt: 'plaintext'
};
function normalizeLang(lang: string | undefined): string {
  if (!lang) return 'plaintext';

  return lang
    .toLowerCase()
    .trim()
    .replace(/^language-/, '')
    .replace(/\s+/g, '');
}
export function resolvePrismLang(rawLang: string | undefined): string {
  const lang = normalizeLang(rawLang);

  if (PRISM_LANG_ALIASES[lang]) {
    return PRISM_LANG_ALIASES[lang];
  }

  // fallback: thử trực tiếp
  return lang || 'plaintext';
}
const loadedLanguages = new Set<string>();
export function loadPrismLanguageAuto(rawLang: string | undefined): Promise<string> {
  const lang = resolvePrismLang(rawLang);

  return new Promise((resolve) => {
    if (loadedLanguages.has(lang) || lang === 'plaintext') {
      resolve(lang);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://cdn.jsdelivr.net/npm/prismjs/components/prism-${lang}.min.js`;
    script.async = true;

    script.onload = () => {
      loadedLanguages.add(lang);
      resolve(lang);
    };

    script.onerror = () => {
      console.warn(`[Prism] Cannot load language: ${lang}`);
      resolve('plaintext');
    };

    document.body.appendChild(script);
  });
}