// Sayfayi data/ klasorundeki verilerden yeniden uretir (ag erisimi gerektirmez).
// Kullanim: node scripts/uret.mjs
import { readFile, writeFile } from 'node:fs/promises';
import sayfa from '../lib/sayfa.js';

const KOK = new URL('..', import.meta.url).pathname;
const oku = async (p) => JSON.parse(await readFile(KOK + p, 'utf8'));

const html = sayfa.sayfayiUret(await readFile(KOK + 'index.html', 'utf8'), {
  site: await oku('data/site.json'),
  yayinlar: await oku('data/yayinlar.json'),
  guncel: await oku('data/guncel.json')
});
await writeFile(KOK + 'index.html', html, 'utf8');
console.log('index.html yeniden uretildi');
