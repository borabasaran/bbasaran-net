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

test('kart eklenince numara ve sayaç güncellenir, bağlantı ve etiket rengi işlenir', () => {
  const v = veri();
  v.site.calismalar.kartlar.push({ baslik: 'Yeni', metin: 'Deneme', etiket: 'Kullanımda', renk: 'yesil', baglanti: 'https://daf-asistan.bbasaran.net', baglantiMetni: 'Asistanı aç' });
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  const no = String(v.site.calismalar.kartlar.length).padStart(2, '0');
  assert.match(html, new RegExp('<p class="no">' + no + '</p>\\n          <h3>Yeni</h3>'));
  assert.match(html, new RegExp('<span>' + no + '</span>\\n    </div>'));
  assert.match(html, /<a class="card-git" href="https:\/\/daf-asistan\.bbasaran\.net">Asistanı aç/);
});

test('yöntemde [[terim]] vurgulanır', () => {
  const v = veri();
  v.site.yontem.sekmeler[0].maddeler[0].metin = 'Bir [[terim]] örneği';
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  assert.match(html, /Bir <span class="sk-kod">terim<\/span> örneği/);
});

test('[yazı](adres) biçimi iletişim bilgilerinde bağlantı olur, güvensiz adres bağlantı olmaz', () => {
  const v = veri();
  const bag = '[Almanca Öğretmenliği Programı](https://abp.anadolu.edu.tr/tr/program/dersler/163/13)';
  v.site.iletisim.bilgiler[0].deger = 'Bkz. ' + bag;
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  const a = '<a href="https://abp.anadolu.edu.tr/tr/program/dersler/163/13" target="_blank" rel="noopener">Almanca Öğretmenliği Programı</a>';
  assert.ok(html.includes('<dd>Bkz. ' + a + '</dd>'), 'iletişim bilgisi bağlantı');
  assert.equal(sayfa.baglantili('[x](javascript:alert(1))'), '[x](javascript:alert(1))');
  assert.equal(sayfa.baglantili('[x](https://a.b/"onmouseover=1)'), '[x](https://a.b/"onmouseover=1)');
  assert.equal(sayfa.baglantili('<b>[x](https://a.b/?a=1&b=2)</b>'), '&lt;b&gt;<a href="https://a.b/?a=1&amp;b=2" target="_blank" rel="noopener">x</a>&lt;/b&gt;');
});

test('kapakta numaralı kısayol satırı çıkar; eski bilgi kutuları görünmez, güvensiz adres atlanır', () => {
  const v = veri();
  v.site.kapak.kisayollar = [
    { etiket: 'Akademik <Takvim>', baglanti: 'https://oidb.example/takvim?a=1&b=2' },
    { etiket: 'Kötü', baglanti: 'javascript:alert(1)' },
    { etiket: 'Atölye', baglanti: '/atolye/' },
    { etiket: '', baglanti: 'https://bos.example' }
  ];
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  const blok = html.slice(html.indexOf('<!-- KAPAK:BASLA -->'), html.indexOf('<!-- KAPAK:BITTI -->'));
  assert.match(blok, /<nav class="kisayol" aria-label="Kısayollar">/);
  assert.match(blok, /<li><a href="https:\/\/oidb\.example\/takvim\?a=1&amp;b=2" target="_blank" rel="noopener"><span class="no">01<\/span> Akademik &lt;Takvim&gt; <span class="ok" aria-hidden="true">↗<\/span><\/a><\/li>/);
  assert.match(blok, /<li><a href="\/atolye\/"><span class="no">02<\/span> Atölye<\/a><\/li>/, 'site içi bağlantı aynı sekmede, işaretsiz');
  assert.doesNotMatch(blok, /javascript|Kötü|bos\.example/);
  assert.doesNotMatch(blok, /class="facts"|fact-v/, 'eski bilgi kutuları kapakta yok');
  v.site.kapak.kisayollar = [];
  const bos = sayfa.sayfayiUret(oku('index.html'), v);
  assert.doesNotMatch(bos, /class="kisayol"/, 'kısayol yoksa satır da çıkmaz');
});

test('eksik işaret açık bir hata verir', () => {
  assert.throws(() => sayfa.sayfayiUret('<html></html>', veri()), /İşaret bulunamadı/);
});

test('kapakta araçlar tek tek sıralanmaz; tek Atölye kutusu bağlantılı araçları sayar ve adlarını gösterir', () => {
  const v = veri();
  v.site.kapak.araclar = [
    { etiket: 'Tez Atlası', baslik: 'Tezler', baglanti: 'https://tezatlasi.bbasaran.net/', dugme: 'Aç' },
    { etiket: 'İlan <Radarı>', baslik: 'İlanlar', baglanti: 'https://ilan.bbasaran.net', dugme: 'Aç', vitrin: 'hayir' },
    { etiket: 'Taslak', baslik: 'Henüz yok', baglanti: '', dugme: '' }
  ];
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  const blok = html.slice(html.indexOf('<!-- ARACLAR:BASLA -->'), html.indexOf('<!-- ARACLAR:BITTI -->'));
  assert.equal((blok.match(/<a class=/g) || []).length, 1, 'yalnızca bir kutu');
  assert.doesNotMatch(blok, /tezatlasi\.bbasaran\.net/);
  assert.match(blok, /<a class="probe arac-link arac-atolye" href="#atolye">\n        <p class="probe-top">Atölye · 02 araç<\/p>/);
  assert.match(blok, /<p class="arac-adlar">Tez Atlası · İlan &lt;Radarı&gt;<\/p>/);
  assert.doesNotMatch(blok, /Taslak|Henüz yok/);
});

test('hiç bağlantılı araç yoksa Atölye kutusu da çıkmaz', () => {
  const v = veri();
  v.site.kapak.araclar = [{ etiket: 'Taslak', baslik: 'Bağlantısız', baglanti: '', dugme: '' }];
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  assert.doesNotMatch(html, /arac-atolye/);
});

test('atölye ilgi özeti: araç adına göre gün gün sayılır, Atölye ön eki birleştirilir', () => {
  const { say } = require('../api/atolye.js');
  const simdi = Date.parse('2026-11-01T09:00:00Z');
  const s = say([
    { olusturuldu: '2026-11-01T08:00:00Z', deger: 'Tez Atlası' },
    { olusturuldu: '2026-11-01T07:00:00Z', deger: 'Atölye: Tez Atlası' },
    { olusturuldu: '2026-10-30T10:00:00Z', deger: 'İlan Radarı' },
    { olusturuldu: '2026-10-30T10:00:00Z', deger: 'Atölye · 05 araç' },
    { olusturuldu: '2026-10-30T10:00:00Z', deger: 'Dış bağlantı: avesis.anadolu.edu.tr' },
    { olusturuldu: '2026-10-01T10:00:00Z', deger: 'Tez Atlası' }
  ], simdi, 7);
  assert.strictEqual(s.gunler.length, 7);
  assert.strictEqual(s.gunler[6], '2026-11-01');
  assert.deepStrictEqual(s.araclar['Tez Atlası'], [0, 0, 0, 0, 0, 0, 2]);
  assert.deepStrictEqual(s.araclar['İlan Radarı'], [0, 0, 0, 0, 1, 0, 0]);
  assert.strictEqual(Object.keys(s.araclar).length, 2);
});

test('yayın: DOI varsa başlık ve künye işareti doi.org adresine gider; yoksa bağlantı, ikisi de yoksa düz metin', () => {
  const v = veri();
  v.yayinlar.makaleler = [
    { yil: 2026, baslik: 'DOI Makalesi', yazarlar: '', kaynak: 'Dergi', ayrinti: '1(1)', dizin: 'SSCI', doi: '10.1080/1049.2026.123', baglanti: 'https://baska.example' },
    { yil: 2025, baslik: 'Bağlantılı Makale', yazarlar: '', kaynak: 'Dergi', ayrinti: '', dizin: '', doi: '', baglanti: 'https://dergipark.org.tr/x?a=1&b=2' },
    { yil: 2024, baslik: 'Düz Makale', yazarlar: '', kaynak: 'Dergi', ayrinti: '', dizin: '' }
  ];
  const html = sayfa.sayfayiUret(oku('index.html'), v);
  assert.match(html, /<a class="pub-git" href="https:\/\/doi\.org\/10\.1080\/1049\.2026\.123" target="_blank" rel="noopener">DOI Makalesi<\/a>/);
  assert.match(html, /<a class="pub-adres" href="https:\/\/doi\.org\/10\.1080\/1049\.2026\.123"[^>]*>DOI <span class="pub-doi">10\.1080\/1049\.2026\.123<\/span> <span aria-hidden="true">↗<\/span><\/a>/);
  assert.doesNotMatch(html, /baska\.example/, 'DOI varsa bağlantı kullanılmaz');
  assert.match(html, /<a class="pub-git" href="https:\/\/dergipark\.org\.tr\/x\?a=1&amp;b=2"/);
  assert.match(html, />Bağlantı <span aria-hidden="true">↗<\/span><\/a>/);
  assert.match(html, /<p class="pub-t">Düz Makale<\/p>/);
});

test('DOI önerileri: birebir başlık kesin, benzer başlık olası; DOI\'si olan yayın ve kullanılmış DOI önerilmez', () => {
  const y = {
    makaleler: [
      { yil: 2026, baslik: 'Human Reliability vs. Machine Consistency: Evaluating AI-Based Grading' },
      { yil: 2025, baslik: 'Smart Graders? Untersuchung des Potenzials', doi: '10.1/var' },
      { yil: 2024, baslik: 'Yapay zekâ ve öğretmen eğitimi üzerine bir inceleme' },
      { yil: 2020, baslik: 'Hiç eşleşmeyecek başka bir çalışma başlığı' }
    ],
    bolumler: [{ yil: 2023, baslik: 'Diplomatik Üstünlük: Almanca Dil Yeterliği' }]
  };
  const kayit = [
    { yil: 2026, baslik: 'Human reliability vs. machine consistency: evaluating AI-based grading', doi: 'https://doi.org/10.1007/s1' },
    { yil: 2025, baslik: 'Yapay Zekâ ve Öğretmen Eğitimi Üzerine İnceleme', doi: 'https://doi.org/10.2/y' },
    { yil: 2025, baslik: 'Smart Graders', doi: 'https://doi.org/10.1/VAR' },
    { yil: 2010, baslik: 'Diplomatik Üstünlük: Almanca Dil Yeterliği ve Dış İlişkiler', doi: 'https://doi.org/10.3/z' },
    { yil: 2024, baslik: 'Kayıtsız', doi: '' }
  ];
  const o = sayfa.doiOnerileri(y, kayit);
  assert.deepEqual(o.map((x) => [x.baslik.slice(0, 12), x.doi, x.kesin]), [
    ['Human Reliab', '10.1007/s1', true],
    ['Yapay zekâ v', '10.2/y', false]
  ]);
  assert.equal(o[0].oge, y.makaleler[0], 'öneri listedeki kayda bağlıdır');
  assert.equal(sayfa.doiYalin('doi:10.5/a'), '10.5/a');
});
