// WOFF 1.0 → TTF (sfnt), tanpa dependensi. Membuat TTF untuk gambar OG dari paket @fontsource
// (sharp/Pango hanya membaca TTF/OTF). Lihat src/assets/fonts/README.md.
// Pakai: node scripts/woff-to-ttf.mjs <masuk.woff> <keluar.ttf>
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const [, , input, output] = process.argv;
const woff = readFileSync(input);
if (woff.readUInt32BE(0) !== 0x774f4646) throw new Error('not WOFF 1.0');
const flavor = woff.readUInt32BE(4);
const numTables = woff.readUInt16BE(12);
const tables = [];
for (let i = 0; i < numTables; i++) {
  const o = 44 + i * 20;
  const tag = woff.readUInt32BE(o);
  const offset = woff.readUInt32BE(o + 4);
  const compLength = woff.readUInt32BE(o + 8);
  const origLength = woff.readUInt32BE(o + 12);
  const checksum = woff.readUInt32BE(o + 16);
  const raw = woff.subarray(offset, offset + compLength);
  const data = compLength < origLength ? inflateSync(raw) : raw;
  tables.push({ tag, checksum, data });
}
let searchRange = 1;
let entrySelector = 0;
while (searchRange * 2 <= numTables) {
  searchRange *= 2;
  entrySelector++;
}
searchRange *= 16;
const headerSize = 12 + numTables * 16;
let offset = headerSize;
const placed = tables.map((t) => {
  const p = { ...t, offset };
  offset += (t.data.length + 3) & ~3;
  return p;
});
const out = Buffer.alloc(offset);
out.writeUInt32BE(flavor, 0);
out.writeUInt16BE(numTables, 4);
out.writeUInt16BE(searchRange, 6);
out.writeUInt16BE(entrySelector, 8);
out.writeUInt16BE(numTables * 16 - searchRange, 10);
placed.forEach((t, i) => {
  const o = 12 + i * 16;
  out.writeUInt32BE(t.tag, o);
  out.writeUInt32BE(t.checksum, o + 4);
  out.writeUInt32BE(t.offset, o + 8);
  out.writeUInt32BE(t.data.length, o + 12);
  t.data.copy(out, t.offset);
});
writeFileSync(output, out);
console.log(output, out.length);
