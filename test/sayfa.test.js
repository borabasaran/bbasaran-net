const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sayfa = require('../lib/sayfa.js');

const kok = path.join(__dirname, '..');
const oku = (p) => fs.readFileSync(path.join(kok, p), 'utf8');
const veri = () => ({
  site: JSON.parse(oku('data/site.json')),
  yayinlar: JSON.parse(oku('data/yayinlar.json')),
  guncel: JSON.parse(oku('data/guncel.json'))
});

test('index.html verilerle birebir uyumlu (yeniden üretim hiçbir şeyi değiştirmez)', () => {
  const html = oku('index.html');
  assert.equal(sayfa.sayfayiUret(html, veri()), html);
});

test('tüm içerik blok işaretleri sayfada var', () => {
  const html = oku('index.html');
  for (const ad of ['KAPAK', 'HAKKINDA', 'ARASTIRMA', 'CALISMALAR', 'YONTEM', 'YAYINLAR', 'YAYINNOTU', 'GUNCEL', 'ILETISIM', 'KONULAR', 'BILGILER']) {
    assert.ok(html.includes('<!-- ' + ad + ':BASLA -->') && html.includes('<!-- ' + ad + ':BITTI -->'), ad);
  }
});

test('metinlerdeki HTML kaçırılır, var olan varlıklar korunur', () => {
  const v = veri();
  v.site.hakkinda.paragraflar = ['<script>alert(1)</script> & A &amp; B'];
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; A &amp; B/);
  assert.doesNotMatch(html, /<script>alert/);
});

test('kart eklenince numara ve sayaç güncellenir, bağlantı ve etiket rengi işlenir', () => {
  const v = veri();
  v.site.calismalar.kartlar.push({ baslik: 'Yeni', metin: 'Deneme', etiket: 'Kullanımda', renk: 'yesil', baglanti: 'https://daf-asistan.bbasaran.net', baglantiMetni: 'Asistanı aç' });
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  assert.match(html, /<p class="no">07<\/p>\n          <h3>Yeni<\/h3>/);
  assert.match(html, /<span>07<\/span>\n    <\/div>/);
  assert.match(html, /<a class="card-git" href="https:\/\/daf-asistan\.bbasaran\.net">Asistanı aç/);
});

test('yöntemde [[terim]] vurgulanır, kapakta tek satırlık bilgi dönmez', () => {
  const v = veri();
  v.site.yontem.sekmeler[0].maddeler[0].metin = 'Bir [[terim]] örneği';
  v.site.kapak.bilgiler[0].satirlar = ['Tek satır'];
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  assert.match(html, /Bir <span class="sk-kod">terim<\/span> örneği/);
  assert.match(html, /<p class="fact-v">Tek satır<\/p>/);
  assert.equal((html.match(/data-akis=/g) || []).length, 3);
});

test('[yazı](adres) biçimi kapakta ve iletişim bilgilerinde bağlantı olur, güvensiz adres bağlantı olmaz', () => {
  const v = veri();
  const bag = '[Almanca Öğretmenliği Programı](https://abp.anadolu.edu.tr/tr/program/dersler/163/13)';
  v.site.kapak.bilgiler[0].satirlar = [bag, 'İkinci & satır'];
  v.site.iletisim.bilgiler[0].deger = 'Bkz. ' + bag;
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  const a = '<a href="https://abp.anadolu.edu.tr/tr/program/dersler/163/13" target="_blank" rel="noopener">Almanca Öğretmenliği Programı</a>';
  assert.ok(html.includes('<p class="fact-v" data-akis="'), 'dönen satır korunur');
  assert.ok(html.includes('">' + a + '</p>'), 'ilk satır bağlantı');
  assert.ok(html.includes('<dd>Bkz. ' + a + '</dd>'), 'iletişim bilgisi bağlantı');
  const akis = JSON.parse(html.match(/data-akis="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  assert.deepEqual(akis, [a, 'İkinci &amp; satır'], 'dönen satırlar hazır HTML olarak saklanır');
  assert.equal(sayfa.baglantili('[x](javascript:alert(1))'), '[x](javascript:alert(1))');
  assert.equal(sayfa.baglantili('[x](https://a.b/"onmouseover=1)'), '[x](https://a.b/"onmouseover=1)');
  assert.equal(sayfa.baglantili('<b>[x](https://a.b/?a=1&b=2)</b>'), '&lt;b&gt;<a href="https://a.b/?a=1&amp;b=2" target="_blank" rel="noopener">x</a>&lt;/b&gt;');
});

test('eksik işaret açık bir hata verir', () => {
  assert.throws(() => sayfa.sayfayiUret('<html></html>', veri()), /İşaret bulunamadı/);
});
