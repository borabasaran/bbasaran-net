// bbasaran.net icerik guncelleyici
// Ayda bir GitHub Actions tarafindan calistirilir.
//
// Ilke: yayin listesine OTOMATIK EKLEME YAPILMAZ.
// OpenAlex'te bulunup listede gorunmeyen kayitlar data/aday.json icine yazilir,
// siteye yansimaz. Insan gozden gecirip dogru kunyesiyle yayinlar.json'a tasir.
//
// Tam otomatik olan tek sey guncel kitap cagrisi bandidir.
// Sayfa, lib/sayfa.js ile data/ klasorundeki verilerden yeniden uretilir.

import { readFile, writeFile } from 'node:fs/promises';
import sayfa from '../lib/sayfa.js';

const ORCID = '0000-0003-0251-5895';
const KITAP_URL = sayfa.KITAP_URL;
const KOK = new URL('..', import.meta.url).pathname;

const oku = (p) => readFile(KOK + p, 'utf8');
const yaz = (p, s) => writeFile(KOK + p, s, 'utf8');

const sadelestir = (s) => String(s)
  .toLocaleLowerCase('tr')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/[^\p{L}\p{N}]+/gu, '')
  .slice(0, 90);

async function getir(url, tip = 'json') {
  const y = await fetch(url, {
    headers: { 'user-agent': 'bbasaran.net-guncelleyici' },
    signal: AbortSignal.timeout(25000)
  });
  if (!y.ok) throw new Error(url + ' -> ' + y.status);
  return tip === 'json' ? y.json() : y.text();
}

/* ---------- OpenAlex ---------- */
async function openAlex() {
  const url = 'https://api.openalex.org/works'
    + '?filter=author.orcid:' + ORCID
    + '&per-page=100&sort=publication_year:desc';
  const veri = await getir(url);
  return (veri.results || []).map((w) => ({
    yil: w.publication_year || 0,
    baslik: (w.display_name || '').trim(),
    kaynak: w.primary_location?.source?.display_name || '',
    doi: w.doi || ''
  })).filter((k) => k.baslik && k.yil);
}

/* ---------- guncel kitap ---------- */
function etiketsiz(s) {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function guncelKitap() {
  const html = await getir(KITAP_URL, 'text');
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const bas = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const aday = [h1 && etiketsiz(h1[1]), og && og[1], bas && etiketsiz(bas[1])]
    .filter((s) => s && s.length > 3 && s.length < 140);
  return aday[0] || '';
}

/* ---------- ana akis ---------- */
const site = JSON.parse(await oku('data/site.json'));
const yayinlar = JSON.parse(await oku('data/yayinlar.json'));
const guncel = JSON.parse(await oku('data/guncel.json'));
const adayDosya = JSON.parse(await oku('data/aday.json'));

try {
  const bulunan = await openAlex();
  const basliklar = new Set(
    [...yayinlar.makaleler, ...yayinlar.bolumler].map((k) => sadelestir(k.baslik))
  );
  const yoksayilan = new Set((adayDosya.yoksayilanlar || []).map(sadelestir));
  const adaylar = bulunan.filter((k) => !basliklar.has(sadelestir(k.baslik)) && !yoksayilan.has(sadelestir(k.baslik)));
  adayDosya.adaylar = adaylar;
  console.log('aday sayisi: ' + adaylar.length);
  adaylar.forEach((k) => console.log('  aday: ' + k.yil + ' - ' + k.baslik));
} catch (e) {
  console.warn('OpenAlex atlandi: ' + e.message);
}

try {
  const kitap = await guncelKitap();
  if (kitap) guncel.kitap = kitap;
} catch (e) {
  console.warn('kitap sayfasi atlandi: ' + e.message);
}

const bugun = new Date().toISOString().slice(0, 10);
guncel.guncellendi = bugun;
adayDosya.guncellendi = bugun;

await yaz('data/guncel.json', JSON.stringify(guncel, null, 2) + '\n');
await yaz('data/aday.json', JSON.stringify(adayDosya, null, 2) + '\n');

const html = sayfa.sayfayiUret(await oku('index.html'), { site, yayinlar, guncel });
await yaz('index.html', html);

console.log('bitti - kitap: ' + (guncel.kitap || '-') + ' - aday: ' + (adayDosya.adaylar || []).length);
