// bbasaran.net icerik guncelleyici
// Ayda bir GitHub Actions tarafindan calistirilir.
//
// Ilke: yayin listesine OTOMATIK EKLEME YAPILMAZ.
// OpenAlex'te bulunup listede gorunmeyen kayitlar data/aday.json icine yazilir,
// siteye yansimaz. Insan gozden gecirip dogru kunyesiyle yayinlar.json'a tasir.
//
// Tam otomatik olan tek sey guncel kitap cagrisi bandidir.

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

/* ---------- HTML uretimi ---------- */
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

function bantHtml(kitap) {
  if (!kitap) return '';
  const ad = kacis(kitap);
  const metin = '<b>' + ad + '</b> · Kitap bölümü çağrısı · '
    + 'Ayrıntılar ve başvuru için tıklayın <span class="ok">→</span> &nbsp;&nbsp;·&nbsp;&nbsp; ';
  return '  <a class="bant" href="' + KITAP_URL + '">\n'
    + '    <span class="bant-et">Güncel çağrı</span>\n'
    + '    <span class="bant-akis">\n'
    + '      <span>' + metin + '</span>\n'
    + '      <span aria-hidden="true">' + metin + '</span>\n'
    + '    </span>\n'
    + '  </a>';
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
const adayDosya = JSON.parse(await oku('data/aday.json'));

try {
  const bulunan = await openAlex();
  const basliklar = new Set(
    [...yayinlar.makaleler, ...yayinlar.bolumler].map((k) => sadelestir(k.baslik))
  );
  const adaylar = bulunan.filter((k) => !basliklar.has(sadelestir(k.baslik)));
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

let html = await oku('index.html');

html = blokDegistir(html, 'YAYINLAR',
  grup('Makaleler', yayinlar.makaleler) + '\n\n' + grup('Kitap bölümleri', yayinlar.bolumler));

html = blokDegistir(html, 'GUNCEL', bantHtml(guncel.kitap));

await yaz('index.html', html);

console.log('bitti - kitap: ' + (guncel.kitap || '-') + ' - aday: ' + (adayDosya.adaylar || []).length);
