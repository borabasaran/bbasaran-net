// bbasaran.net icerik guncelleyici
// Ayda bir GitHub Actions tarafindan calistirilir.
// 1) OpenAlex'ten ORCID ile yeni yayinlari ceker, data/yayinlar.json icine EKLER (asla silmez)
// 2) kitap.bbasaran.net sayfasindan guncel kitap basligini ceker
// 3) index.html icindeki isaretli bloklari yeniden yazar

import { readFile, writeFile } from 'node:fs/promises';

const ORCID = '0000-0003-0251-5895';
const KITAP_URL = 'https://kitap.bbasaran.net';
const KOK = new URL('..', import.meta.url).pathname;

const oku = (p) => readFile(KOK + p, 'utf8');
const yaz = (p, s) => writeFile(KOK + p, s, 'utf8');

const kacis = (s) => String(s)
  .replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

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

/* ---------- 1. OpenAlex ---------- */
async function openAlex() {
  const url = 'https://api.openalex.org/works'
    + '?filter=author.orcid:' + ORCID
    + '&per-page=100&sort=publication_year:desc';
  const veri = await getir(url);
  return (veri.results || []).map((w) => ({
    yil: w.publication_year || 0,
    baslik: (w.display_name || '').trim(),
    yazarlar: '',
    kaynak: w.primary_location?.source?.display_name || '',
    ayrinti: [
      w.biblio?.volume || '',
      w.biblio?.issue ? '(' + w.biblio.issue + ')' : ''
    ].join('') || '',
    dizin: ''
  })).filter((k) => k.baslik && k.yil);
}

/* ---------- 2. guncel kitap ---------- */
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

/* ---------- 3. HTML uretimi ---------- */
function satir(k) {
  const yazar = k.yazarlar ? k.yazarlar + ' · ' : '';
  const kaynak = k.kaynak ? '<em>' + kacis(k.kaynak) + '</em>' : '';
  const ayrinti = k.ayrinti ? ', ' + kacis(k.ayrinti) : '';
  const dizin = k.dizin
    ? '<span class="idx' + (k.dizin === 'SSCI' ? ' ssci' : '') + '">' + kacis(k.dizin) + '</span>'
    : '';
  return '        <li class="reveal">\n'
    + '          <span class="yr">' + k.yil + '</span>\n'
    + '          <div>\n'
    + '            <p class="pub-t">' + kacis(k.baslik) + '</p>\n'
    + '            <p class="pub-m">' + yazar + kaynak + ayrinti + dizin + '</p>\n'
    + '          </div>\n'
    + '        </li>';
}

function grup(baslik, liste) {
  const sirali = [...liste].sort((a, b) => b.yil - a.yil);
  return '    <div class="pubgroup">\n'
    + '      <h3>' + baslik + ' <span class="count">' + sirali.length + '</span></h3>\n'
    + '      <ol class="pubs">\n'
    + sirali.map(satir).join('\n') + '\n'
    + '      </ol>\n'
    + '    </div>';
}

function blokDegistir(html, ad, icerik) {
  const bas = '<!-- ' + ad + ':BASLA -->';
  const son = '<!-- ' + ad + ':BITTI -->';
  const i = html.indexOf(bas);
  const j = html.indexOf(son);
  if (i < 0 || j < 0) {
    console.warn('isaret bulunamadi: ' + ad);
    return html;
  }
  return html.slice(0, i + bas.length) + '\n' + icerik + '\n' + html.slice(j);
}

/* ---------- ana akis ---------- */
const yayinlar = JSON.parse(await oku('data/yayinlar.json'));
const guncel = JSON.parse(await oku('data/guncel.json'));

let eklenen = 0;
try {
  const bulunan = await openAlex();
  const mevcut = new Set(
    [...yayinlar.makaleler, ...yayinlar.bolumler].map((k) => sadelestir(k.baslik))
  );
  for (const k of bulunan) {
    const anahtar = sadelestir(k.baslik);
    if (anahtar && !mevcut.has(anahtar)) {
      yayinlar.makaleler.push(k);
      mevcut.add(anahtar);
      eklenen++;
      console.log('yeni yayin: ' + k.yil + ' - ' + k.baslik);
    }
  }
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
yayinlar.guncellendi = bugun;
guncel.guncellendi = bugun;

await yaz('data/yayinlar.json', JSON.stringify(yayinlar, null, 2) + '\n');
await yaz('data/guncel.json', JSON.stringify(guncel, null, 2) + '\n');

let html = await oku('index.html');

html = blokDegistir(html, 'YAYINLAR',
  grup('Makaleler', yayinlar.makaleler) + '\n\n' + grup('Kitap bölümleri', yayinlar.bolumler));

const guncelHtml = guncel.kitap
  ? '  <div class="wrap guncel-ic">\n'
    + '    <span class="guncel-et">Şu an</span>\n'
    + '    <span class="guncel-me">' + kacis(guncel.kitap) + '</span>\n'
    + '  </div>'
  : '';
html = blokDegistir(html, 'GUNCEL', guncelHtml);

await yaz('index.html', html);

console.log('bitti - yeni yayin: ' + eklenen + ' - kitap: ' + (guncel.kitap || '-'));
