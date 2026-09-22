const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sayfa = require('../lib/sayfa.js');

const kok = path.join(__dirname, '..');
const oku = (p) => fs.readFileSync(path.join(kok, p), 'utf8');
// Kapakta dönen (birden çok satırlı, liste olmayan) kutu sayısı
const donenSayisi = (bilgiler) => bilgiler.filter((b) => b.gorunum !== 'liste' && b.satirlar.filter((x) => x.trim()).length > 1).length;
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
  for (const ad of ['KAPAK', 'ARACLAR', 'HAKKINDA', 'ARASTIRMA', 'CALISMALAR', 'YONTEM', 'YAYINLAR', 'YAYINNOTU', 'GUNCEL', 'ILETISIM', 'KONULAR', 'BILGILER']) {
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

test('kart eklenince numara ve sayac ügüncellenir, bağlantı ve etiket rengi işlenir', () => {
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
  assert.equal((html.match(/data-akis=/g) || []).length, donenSayisi(v.site.kapak.bilgiler));
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

test('görünümü liste olan kutuda bütün satırlar alt alta görünür ve dönmez', () => {
  const v = veri();
  v.site.kapak.bilgiler.push({ baslik: 'Linkler', gorunum: 'liste', satirlar: ['[A](https://a.example)', '[B](https://b.example)'] });
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  assert.ok(html.includes('<p class="fact-v fact-liste"><a href="https://a.example" target="_blank" rel="noopener">A</a><br><a href="https://b.example" target="_blank" rel="noopener">B</a></p>'));
  assert.equal((html.match(/data-akis=/g) || []).length, donenSayisi(v.site.kapak.bilgiler), 'liste kutusu dönmez');
  assert.equal(donenSayisi(v.site.kapak.bilgiler), donenSayisi(veri().site.kapak.bilgiler));
});

test('eksik işaret açık bir hata verir', () => {
  assert.throws(() => sayfa.sayfayiUret('<html></html>', veri()), /İşaret bulunamadı/);
});

test('kapak araçları verilerden üretilir; bağlantısı olmayan kutu çıkmaz', () => {
  const v = veri();
  v.site.kapak.araclar = [
    { etiket: 'ArSi', baslik: '11 aşama', baglanti: 'https://arsi.bbasaran.net', dugme: 'Sihirbazı aç' },
    { etiket: 'Taslak', baslik: 'Henüz yok', baglanti: '', dugme: '' }
  ];
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  assert.match(html, /<a class="probe arac-link" href="https:\/\/arsi\.bbasaran\.net">\n        <p class="probe-top">ArSi<\/p>/);
  assert.match(html, /<span class="arac-git">Sihirbazı aç <span class="ok" aria-hidden="true">→<\/span><\/span>/);
  assert.doesNotMatch(html, /Henüz yok/);
});
