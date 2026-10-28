const test = require('node:test');
const assert = require('node:assert');
const { hareketleriKur, baslangicGunu } = require('../api/panel.js');

test('art arda tıklamalar tek harekette toplanır, kaynak oturumdan gelir', () => {
  const tiklamalar = [
    { olusturuldu: '2026-10-09T19:11:40.78Z', deger: 'Kitap çağrısı', cihaz: 'telefon', ulke: 'TR', oturum: 'a1' },
    { olusturuldu: '2026-10-09T19:11:40.00Z', deger: 'Kitap çağrısı', cihaz: 'telefon', ulke: 'TR', oturum: 'a1' },
    { olusturuldu: '2026-10-09T19:11:38.93Z', deger: 'Kitap çağrısı', cihaz: 'telefon', ulke: 'TR', oturum: 'a1' },
    { olusturuldu: '2026-10-09T19:11:38.40Z', deger: 'Kitap çağrısı', cihaz: 'telefon', ulke: 'TR', oturum: 'a1' },
    { olusturuldu: '2026-10-03T13:49:41Z', deger: 'Kitap çağrısı', cihaz: 'masaustu', ulke: 'TR', oturum: 'b2' },
    { olusturuldu: '2026-10-02T10:00:00Z', deger: 'ArSi', cihaz: 'masaustu', ulke: 'DE', oturum: 'c3' }
  ];
  const ziyaretler = [
    { oturum: 'a1', kaynak: null },
    { oturum: 'b2', kaynak: 'google.com' }
  ];
  const s = hareketleriKur(tiklamalar, ziyaretler);
  assert.strictEqual(s.hareketler.length, 3);
  assert.deepStrictEqual(s.hareketler[0], { zaman: '2026-10-09T19:11:38.40Z', ad: 'Kitap çağrısı', adet: 4, cihaz: 'telefon', ulke: 'TR', kaynak: 'doğrudan' });
  assert.strictEqual(s.hareketler[1].kaynak, 'google.com');
  assert.strictEqual(s.hareketler[2].kaynak, 'bilinmiyor');
  assert.strictEqual(s.kisiSayisi['Kitap çağrısı'], 2);
});

test('aralık başlangıcı Türkiye takvimine göre hesaplanır', () => {
  // 27 Ekim 22:30 UTC, Türkiye'de 28 Ekim 01:30
  assert.strictEqual(baslangicGunu(1, new Date('2026-10-27T22:30:00Z')), '2026-10-28');
  assert.strictEqual(baslangicGunu(30, new Date('2026-10-28T09:00:00Z')), '2026-09-29');
});

test('paylaşım etiketi kaynak olarak yazılır, geçersiz etiket yok sayılır', async () => {
  const olay = require('../api/olay.js');
  const eski = { f: global.fetch, u: process.env.SUPABASE_URL, a: process.env.SUPABASE_ANAHTAR };
  process.env.SUPABASE_URL = 'https://ornek.supabase.co';
  process.env.SUPABASE_ANAHTAR = 'x';
  const yazilan = [];
  global.fetch = async (url, o) => { yazilan.push(JSON.parse(o.body)); return { ok: true }; };
  const istek = (govde) => ({ method: 'POST', headers: { host: 'bbasaran.net' }, body: govde });
  const yanit = () => ({ setHeader() {}, end() {} });
  try {
    await olay(istek({ tur: 'ziyaret', etiket: 'whatsapp', kaynak: 'https://google.com/' }), yanit());
    await olay(istek({ tur: 'ziyaret', etiket: 'Kötü etiket!', kaynak: 'https://www.google.com/ara' }), yanit());
    await olay(istek({ tur: 'ziyaret' }), yanit());
  } finally {
    global.fetch = eski.f; process.env.SUPABASE_URL = eski.u || ''; process.env.SUPABASE_ANAHTAR = eski.a || '';
  }
  assert.strictEqual(yazilan[0].kaynak, 'etiket:whatsapp');
  assert.strictEqual(yazilan[1].kaynak, 'google.com');
  assert.strictEqual(yazilan[2].kaynak, null);
});

test('Google arama verisi: imzalı anahtarla okunur, eksik ayar ve izin hatası anlaşılır döner', async () => {
  const crypto = require('node:crypto');
  const panel = require('../api/panel.js');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const eski = { f: global.fetch, a: process.env.GSC_ANAHTAR };
  const yanitAl = async (govde) => {
    let cikti = null;
    await panel.arama({ setHeader() {}, end(x) { cikti = JSON.parse(x); } }, govde, new Date('2026-10-28T09:00:00Z'));
    return cikti;
  };
  try {
    delete process.env.GSC_ANAHTAR;
    assert.strictEqual((await yanitAl({ gun: 30 })).durum, 'kurulmadi');

    process.env.GSC_ANAHTAR = JSON.stringify({ client_email: 'okuyucu@ornek.iam.gserviceaccount.com', private_key: pem });
    const istekler = [];
    let izinVer = true;
    global.fetch = async (url, o) => {
      istekler.push({ url, o });
      if (url.startsWith('https://oauth2.googleapis.com/token')) {
        const jwt = decodeURIComponent(o.body.split('assertion=')[1]);
        const [b, g, imza] = jwt.split('.');
        const dogru = crypto.verify('RSA-SHA256', Buffer.from(b + '.' + g), publicKey, Buffer.from(imza, 'base64url'));
        assert.ok(dogru, 'JWT imzası doğrulanmalı');
        assert.strictEqual(JSON.parse(Buffer.from(g, 'base64url')).scope, 'https://www.googleapis.com/auth/webmasters.readonly');
        return { ok: true, json: async () => ({ access_token: 'belirtec', expires_in: 3600 }) };
      }
      if (!izinVer) return { ok: false, status: 403, json: async () => ({ error: { message: 'User does not have sufficient permission' } }) };
      const q = JSON.parse(o.body);
      assert.ok(url.includes(encodeURIComponent('sc-domain:bbasaran.net')));
      assert.strictEqual(q.startDate, '2026-09-29');
      assert.strictEqual(q.endDate, '2026-10-28');
      if (!q.dimensions) return { ok: true, json: async () => ({ rows: [{ clicks: 2, impressions: 40 }] }) };
      if (q.dimensions[0] === 'query') return { ok: true, json: async () => ({ rows: [{ keys: ['bora başaran'], clicks: 2, impressions: 15, position: 1.24 }] }) };
      return { ok: true, json: async () => ({ rows: [{ keys: ['https://bbasaran.net/'], clicks: 2, impressions: 40, position: 3.5 }] }) };
    };
    panel._gscSifirla();
    const d = await yanitAl({ gun: 30 });
    assert.strictEqual(d.durum, 'hazir');
    assert.deepStrictEqual(d.toplam, { tiklama: 2, gosterim: 40 });
    assert.deepStrictEqual(d.aramalar[0], { ad: 'bora başaran', tiklama: 2, gosterim: 15, sira: 1.2 });
    assert.strictEqual(d.sayfalar[0].ad, 'https://bbasaran.net/');

    izinVer = false;
    const red = await yanitAl({ gun: 30 });
    assert.strictEqual(red.durum, 'izin');
    // Belirteç önbellekten kullanıldı: ikinci çağrıda yeniden alınmadı
    assert.strictEqual(istekler.filter(x => x.url.startsWith('https://oauth2')).length, 1);
  } finally {
    global.fetch = eski.f;
    if (eski.a === undefined) delete process.env.GSC_ANAHTAR; else process.env.GSC_ANAHTAR = eski.a;
  }
});

test('ziyaretler: giriş kaynağı, süre ve sırayla yapılanlar; kaynak özeti', () => {
  const { istatistikDerle } = require('../api/panel.js');
  const O = (oturum, zaman, tur, deger, kaynak) => ({ oturum, olusturuldu: '2026-10-20T10:' + zaman + 'Z', tur, deger: deger || null, kaynak: kaynak || null, cihaz: 'telefon', ulke: 'TR' });
  const d = istatistikDerle([
    O('a', '00:00', 'ziyaret', null, 'google.com'),
    O('a', '00:10', 'bolum', 'hakkinda'),
    O('a', '00:20', 'bolum', 'yayinlar'),
    O('a', '01:00', 'tiklama', 'Kitap çağrısı'),
    O('a', '01:01', 'tiklama', 'Kitap çağrısı'),
    O('b', '05:00', 'ziyaret'),
    O('c', '06:00', 'bolum', 'hakkinda')
  ]);
  assert.strictEqual(d.ziyaretler.length, 3);
  const a = d.ziyaretler[2];
  assert.strictEqual(a.kaynak, 'google.com');
  assert.strictEqual(a.sure, 61);
  assert.deepStrictEqual(a.adimlar.map(x => [x.tur, x.ad, x.adet]), [['bolum', 'hakkinda', 1], ['bolum', 'yayinlar', 1], ['tiklama', 'Kitap çağrısı', 2]]);
  assert.strictEqual(d.ziyaretler[1].kaynak, 'doğrudan');
  assert.strictEqual(d.ziyaretler[0].kaynak, 'bilinmiyor');
  assert.deepStrictEqual(d.kaynakOzeti.find(x => x.ad === 'google.com'), { ad: 'google.com', ziyaret: 1, ortBolum: 2, tiklayan: 1, son: '2026-10-20T10:00:00Z' });
  assert.deepStrictEqual(d.bolumOzeti.find(x => x.ad === 'hakkinda'), { ad: 'hakkinda', n: 2, kisi: 2, son: '2026-10-20T10:06:00Z' });
  assert.strictEqual(d.bolumListesi[1].kaynak, 'google.com');
  assert.strictEqual(d.tiklamaOzeti[0].n, 2);
  assert.strictEqual(d.hareketler.length, 1);
});
