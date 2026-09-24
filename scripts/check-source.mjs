// Pemeriksa sumber template (.astro). Dijalankan oleh `npm run validate`.
// Astro 7 (compressHTML: 'jsx') membuang baris baru di antara teks dan elemen inline/ekspresi,
// sehingga `dari⏎<a>peta</a>` dirender "daripeta". Skrip ini menandai pola tersebut.
// Perbaikan: tulis teks dan elemen inline di baris yang sama, atau pakai {' '} secara eksplisit.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const INLINE = '(?:a|strong|em|b|i|code|span|cite|abbr)';
const textEnd = /[\p{L}\p{N},.:;)!?”]\s*$/u;
const startsWithInline = new RegExp(`^\\s*<${INLINE}\\b`);
const endsWithInline = new RegExp(`</${INLINE}>\\s*$`);
const startsWithText = /^\s*[\p{L}\p{N}]/u;
const startsWithExpr = /^\s*\{/;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.astro') ? [path] : [];
  });

const findings = [];
for (const file of walk(join(root, 'src'))) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  let inBlock = false; // <style>/<script>/frontmatter tidak diperiksa
  let fences = 0;
  lines.forEach((line, i) => {
    if (line.trim() === '---' && fences < 2) fences++;
    if (fences === 1) return;
    if (/<(style|script)\b/.test(line)) inBlock = true;
    if (/<\/(style|script)>/.test(line)) inBlock = false;
    if (inBlock) return;
    const next = lines[i + 1] ?? '';
    // Baris yang berakhir dengan teks (termasuk `<p>Lihat di`), bukan baris ekspresi/JS.
    const isMarkupText = !/^\s*[{}]/.test(line) && !/=>\s*\(?\s*$/.test(line);
    const rel = relative(root, file).split(sep).join('/');
    const hint = `${line.trim().slice(-40)} ⏎ ${next.trim().slice(0, 40)}`;
    if (isMarkupText && textEnd.test(line) && startsWithInline.test(next)) findings.push(`${rel}:${i + 1}  ${hint}`);
    if (endsWithInline.test(line) && (startsWithText.test(next) || startsWithExpr.test(next))) {
      findings.push(`${rel}:${i + 1}  ${hint}`);
    }
  });
}

if (findings.length > 0) {
  console.error(
    `Pemeriksaan sumber gagal (${findings.length}): teks dan elemen inline dipisah baris baru ` +
      `(spasinya hilang saat render):\n- ${findings.join('\n- ')}`,
  );
  process.exit(1);
}
console.log('Pemeriksaan sumber OK: tidak ada teks/elemen inline yang terpisah baris baru.');
