const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const panel = require('../api/panel.js');

const kok = path.join(__dirname, '..');
const oku = (p) => fs.readFileSync(path.join(kok, p), 'utf8');
const ADAY = {
  aciklama: 'Siteye yansımaz.',
  guncellendi: '2026-09-20',
  adaylar: [{ yil: 2026, baslik: 'Yeni bir makale', kaynak: 'Bir Dergi', doi: '' }]
};

// Bellek içi GitHub taklidi: dal ucu, dosyalar, ağaç/commit/ref yazımı
function sahteGithub() {
  const depo = {
    uc: 'c1',
    dosyalar: {
      'index.html': oku('index.html'),
      'data/site.json': oku('data/site.json'),
      'data/yayinlar.json': oku('data/yayinlar.json'),
      'data/guncel.json': oku('data/guncel.json'),
      'data/aday.json': JSON.stringify(ADAY, null, 2) + '\n'
    },
    agaclar: {}, commitler: { c1: { tree: 't1' } }, yazilan: null, refYaz: 0
  };
  const cevap = (durum, veri) => ({ ok: durum < 300, status: durum, json: async () => veri });
  async function fetchSahte(url, opts) {
    const u = new URL(url);
    assert.equal(u.host, 'api.github.com');
    assert.equal(opts.headers.Authorization, 'Bearer gh_test');
    const yol = u.pathname.replace('/repos/borabasaran/bbasaran-net', '');
    const yontem = opts.method || 'GET';
    const govde = opts.body ? JSON.parse(opts.body) : null;
    if (yontem === 'GET' && yol === '/git/ref/heads/main') return cevap(200, { object: { sha: depo.uc } });
    if (yontem === 'GET' && yol.startsWith('/contents/')) {
      const d = depo.dosyalar[yol.slice('/contents/'.length)];
      return d == null ? cevap(404, { message: 'Not Found' }) : cevap(200, { content: Buffer.from(d).toString('base64') });
    }
    if (yontem === 'GET' && yol.startsWith('/git/commits/')) return cevap(200, depo.commitler[yol.split('/').pop()]);
    if (yontem === 'POST' && yol === '/git/trees') {
      const degisti = govde.tree.some((x) => depo.dosyalar[x.path] !== x.content);
      const sha = degisti ? 't2' : govde.base_tree;
      depo.agaclar[sha] = govde.tree;
      return cevap(201, { sha });
    }
    if (yontem === 'POST' && yol === '/git/commits') { depo.commitler.c2 = { tree: govde.tree }; return cevap(201, { sha: 'c2' }); }
    if (yontem === 'PATCH' && yol === '/git/refs/heads/main') {
      depo.refYaz++;
      if (depo.yarisma) return cevap(422, { message: 'Update is not a fast forward' });
      depo.yazilan = depo.agaclar[depo.commitler[govde.sha].tree];
      depo.uc = govde.sha;
      return cevap(200, {});
    }
    throw new Error('Beklenmeyen istek: ' + yontem + ' ' + yol);
  }
  return { depo, fetchSahte };
}

function istek(govde, basliklar) {
  return { method: 'POST', headers: Object.assign({ host: 'bbasaran.net', origin: 'https://bbasaran.net' }, basliklar || {}), body: govde };
}
function yanitNesnesi() {
  const r = { statusCode: 200, headers: {}, body: '' };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.end = (b) => { r.body = b; };
  r.json = () => JSON.parse(r.body);
  return r;
}
async function calistir(govde, gh, basliklar) {
  const eski = { f: global.fetch, s: process.env.PANEL_SIFRESI, t: process.env.GITHUB_TOKEN };
  process.env.PANEL_SIFRESI = 'panel-sifre';
  process.env.GITHUB_TOKEN = 'gh_test';
  global.fetch = gh ? gh.fetchSahte : eski.f;
  try {
    const r = yanitNesnesi();
    await panel(istek(govde, basliklar), r);
    return r;
  } finally {
    global.fetch = eski.f;
    if (eski.s === undefined) delete process.env.PANEL_SIFRESI; else process.env.PANEL_SIFRESI = eski.s;
    if (eski.t === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = eski.t;
  }
}

test('şifre olmadan hiçbir işlem yapılmaz, yabancı kaynak reddedilir', async () => {
  let r = await calistir({ eylem: 'oku', sifre: 'yanlis' });
  assert.equal(r.statusCode, 401);
  r = await calistir({ eylem: 'giris', sifre: 'panel-sifre' });
  assert.equal(r.statusCode, 200);
  r = await calistir({ eylem: 'giris', sifre: 'panel-sifre' }, null, { origin: 'https://kotu.example' });
  assert.equal(r.statusCode, 403);
});

test('oku: verileri ve sürümü döndürür', async () => {
  const gh = sahteGithub();
  const r = await calistir({ eylem: 'oku', sifre: 'panel-sifre' }, gh);
  assert.equal(r.statusCode, 200);
  const d = r.json();
  assert.equal(d.surum, 'c1');
  assert.equal(d.veri.site.hakkinda.baslik, JSON.parse(oku('data/site.json')).hakkinda.baslik);
  assert.equal(d.veri.aday.adaylar.length, 1);
});

test('değişiklik yoksa commit oluşturulmaz', async () => {
  const gh = sahteGithub();
  const d = (await calistir({ eylem: 'oku', sifre: 'panel-sifre' }, gh)).json();
  const r = await calistir({ eylem: 'kaydet', sifre: 'panel-sifre', surum: d.surum, veri: d.veri }, gh);
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().degisiklik, false);
  assert.equal(gh.depo.refYaz, 0);
});

test('kaydet: veriler ve yeniden üretilmiş sayfa tek commit olarak yazılır', async () => {
  const gh = sahteGithub();
  const d = (await calistir({ eylem: 'oku', sifre: 'panel-sifre' }, gh)).json();
  d.veri.site.hakkinda.baslik = 'Yeni başlık <b>';
  const kart = d.veri.site.calismalar.kartlar[3];
  kart.etiket = 'Kullanımda'; kart.renk = 'yesil'; kart.baglanti = 'https://daf-asistan.bbasaran.net'; kart.baglantiMetni = 'Asistanı aç';
  const aday = d.veri.aday.adaylar.shift();
  d.veri.aday.yoksayilanlar = [aday.baslik];
  const r = await calistir({ eylem: 'kaydet', sifre: 'panel-sifre', surum: d.surum, veri: d.veri }, gh);
  assert.equal(r.statusCode, 200, r.body);
  assert.deepEqual(r.json(), { ok: true, surum: 'c2', degisiklik: true });
  const yazilan = Object.fromEntries(gh.depo.yazilan.map((x) => [x.path, x.content]));
  assert.deepEqual(Object.keys(yazilan).sort(), ['data/aday.json', 'data/guncel.json', 'data/site.json', 'data/yayinlar.json', 'index.html']);
  assert.match(yazilan['index.html'], /<h2 class="mask">Yeni başlık &lt;b&gt;<\/h2>/);
  assert.match(yazilan['index.html'], /<a class="card-git" href="https:\/\/daf-asistan\.bbasaran\.net">Asistanı aç/);
  assert.deepEqual(JSON.parse(yazilan['data/aday.json']).yoksayilanlar, ['Yeni bir makale']);
  assert.equal(yazilan['data/yayinlar.json'], oku('data/yayinlar.json'), 'değişmeyen dosya aynı biçimde yazılır');
});

test('kaydet: arada değişiklik olduysa üzerine yazmaz', async () => {
  const gh = sahteGithub();
  const d = (await calistir({ eylem: 'oku', sifre: 'panel-sifre' }, gh)).json();
  d.veri.site.hakkinda.baslik = 'Değişti';
  gh.depo.uc = 'c9';
  let r = await calistir({ eylem: 'kaydet', sifre: 'panel-sifre', surum: d.surum, veri: d.veri }, gh);
  assert.equal(r.statusCode, 409);
  gh.depo.uc = 'c1'; gh.depo.yarisma = true;
  r = await calistir({ eylem: 'kaydet', sifre: 'panel-sifre', surum: d.surum, veri: d.veri }, gh);
  assert.equal(r.statusCode, 409, 'ref güncellemesi yarışı da çakışma sayılır');
});

test('doğrulama: güvensiz bağlantı ve geçersiz yayın reddedilir, bilinmeyen alanlar atılır', () => {
  const veri = () => ({
    site: JSON.parse(oku('data/site.json')), yayinlar: JSON.parse(oku('data/yayinlar.json')),
    guncel: JSON.parse(oku('data/guncel.json')), aday: ADAY
  });
  let v = veri();
  v.site.calismalar.kartlar[0].baglanti = 'javascript:alert(1)';
  assert.throws(() => panel.dogrula(v), /bağlantı/);
  v = veri();
  v.yayinlar.makaleler[0].yil = 'iki bin';
  assert.throws(() => panel.dogrula(v), /yıl geçersiz/);
  v = veri();
  v.site.hakkinda.gizli = 'x';
  v.site.fazla = { a: 1 };
  const t = panel.dogrula(v);
  assert.equal(t.site.hakkinda.gizli, undefined);
  assert.equal(t.site.fazla, undefined);
  assert.deepEqual(t.site, JSON.parse(oku('data/site.json')), 'mevcut veri aynen korunur');
});

test('doğrulama: atölye alanlarında yalnızca tanınan değerler kalır, eski kayıtlar varsayılan alır', () => {
  const v = {
    site: JSON.parse(oku('data/site.json')), yayinlar: JSON.parse(oku('data/yayinlar.json')),
    guncel: JSON.parse(oku('data/guncel.json')), aday: ADAY
  };
  v.site.kapak.araclar = [
    { etiket: 'Eski', baslik: 'Alanları yok', baglanti: 'https://eski.bbasaran.net', dugme: 'Aç' },
    { etiket: 'Kötü', baslik: 'Garip değerler', baglanti: 'https://k.bbasaran.net', dugme: 'Aç', kategori: '<script>', cizim: 'yok', deney: 'x', vitrin: 'belki', durum: 'kapali', aciklama: 'Metin' }
  ];
  const t = panel.dogrula(v).site.kapak.araclar;
  assert.deepEqual(t[0], { etiket: 'Eski', baslik: 'Alanları yok', baglanti: 'https://eski.bbasaran.net', dugme: 'Aç', kategori: 'ogrenci', cizim: 'tez', deney: '', vitrin: '', durum: '', aciklama: '' });
  assert.equal(t[1].kategori, 'ogrenci');
  assert.equal(t[1].cizim, 'tez');
  assert.equal(t[1].deney, '');
  assert.equal(t[1].vitrin, '');
  assert.equal(t[1].durum, '');
  assert.equal(t[1].aciklama, 'Metin');
});

test('doğrulama: DOI her biçimden yalın hale gelir, geçersiz DOI ve güvensiz yayın bağlantısı reddedilir', () => {
  const veri = () => ({
    site: JSON.parse(oku('data/site.json')), yayinlar: JSON.parse(oku('data/yayinlar.json')),
    guncel: JSON.parse(oku('data/guncel.json')), aday: ADAY
  });
  for (const giris of ['10.1080/abc.1', 'doi:10.1080/abc.1', 'https://doi.org/10.1080/abc.1', 'https://dx.doi.org/10.1080%2Fabc.1', '  10.1080/abc.1  ']) {
    const v = veri();
    v.yayinlar.makaleler[0].doi = giris;
    assert.equal(panel.dogrula(v).yayinlar.makaleler[0].doi, '10.1080/abc.1', giris);
  }
  let v = veri();
  v.yayinlar.makaleler[0].doi = 'bir dergi';
  assert.throws(() => panel.dogrula(v), /DOI geçersiz/);
  v = veri();
  v.yayinlar.bolumler[0].baglanti = 'javascript:alert(1)';
  assert.throws(() => panel.dogrula(v), /bağlantı/);
  v = veri();
  v.yayinlar.bolumler[0].baglanti = 'http://acik.example';
  assert.throws(() => panel.dogrula(v), /https/);
  v = veri();
  v.yayinlar.makaleler[0].doi = '';
  v.yayinlar.makaleler[0].baglanti = '  ';
  const t = panel.dogrula(v).yayinlar.makaleler[0];
  assert.equal('doi' in t, false, 'boş DOI kayda yazılmaz');
  assert.equal('baglanti' in t, false, 'boş bağlantı kayda yazılmaz');
});

test('doğrulama: kısayollar yalnızca ad ve güvenli bağlantıyla kalır, eski veride boş liste olur', () => {
  const veri = () => ({
    site: JSON.parse(oku('data/site.json')), yayinlar: JSON.parse(oku('data/yayinlar.json')),
    guncel: JSON.parse(oku('data/guncel.json')), aday: ADAY
  });
  let v = veri();
  v.site.kapak.kisayollar[0].fazla = 'x';
  assert.deepEqual(Object.keys(panel.dogrula(v).site.kapak.kisayollar[0]), ['etiket', 'baglanti']);
  v = veri();
  v.site.kapak.kisayollar[0].baglanti = 'javascript:alert(1)';
  assert.throws(() => panel.dogrula(v), /Kısayol 1: bağlantı/);
  v = veri();
  v.site.kapak.kisayollar[0].baglanti = 'http://acik.example';
  assert.throws(() => panel.dogrula(v), /https/);
  v = veri();
  v.site.kapak.kisayollar[1].etiket = '  ';
  assert.throws(() => panel.dogrula(v), /Kısayol 2: ad boş/);
  v = veri();
  delete v.site.kapak.kisayollar;
  assert.deepEqual(panel.dogrula(v).site.kapak.kisayollar, []);
});
