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
