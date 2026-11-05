import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

// 确保 dist 目录存在
if (!existsSync('dist')) mkdirSync('dist');

// 1. 运行 Tailwind CSS 生成 CSS
console.log('Building CSS with Tailwind...');
execSync('npx tailwindcss -i ./src/index.css -o ./dist/index.css --minify', { stdio: 'inherit' });

// 2. 复制 favicon
if (existsSync('public/favicon.svg')) copyFileSync('public/favicon.svg', 'dist/favicon.svg');

// 3. 使用原生 esbuild（Go 二进制）打包 JS，内存占用远低于 WASM
console.log('Building JS with native esbuild...');
await esbuild.build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: false,
  sourcemap: false,
  outfile: 'dist/assets/index.js',
  target: ['es2020'],
  format: 'esm',
  splitting: false,
  loader: {
    '.tsx': 'tsx', '.ts': 'ts', '.jsx': 'jsx', '.js': 'js',
    '.svg': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl', '.gif': 'dataurl',
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api'),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  alias: { '@': './src' },
  external: [],
});

// 3.1 JS 按内容哈希重命名，配合 Nginx immutable 缓存实现可靠更新
const jsBuf = readFileSync('dist/assets/index.js');
const hash = createHash('md5').update(jsBuf).digest('hex').slice(0, 8);
const jsName = `index.${hash}.js`;
for (const f of readdirSync('dist/assets')) {
  if (f.startsWith('index') && f.endsWith('.js') && f !== jsName) rmSync(`dist/assets/${f}`);
}
writeFileSync(`dist/assets/${jsName}`, jsBuf);

// 4. 生成 HTML
let html = readFileSync('index.html', 'utf-8');
html = html.replace(/<script type="module">[\s\S]*?<\/script>/, '');
html = html.replace('<script type="module" src="/src/main.tsx"></script>', `<script type="module" src="/assets/${jsName}"></script>`);
html = html.replace('</head>', '  <link rel="stylesheet" href="/index.css">\n</head>');
writeFileSync('dist/index.html', html);

console.log('Build complete! JS:', jsName);