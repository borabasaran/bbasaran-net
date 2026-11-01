/* bbasaran.net: kapaktaki korpus alanı.
   Kapağın arka planında sitenin kendi metinlerinden (yayın başlıkları, araştırma
   alanları, çalışma kartları, Atölye'deki araçlar) çıkarılan sözcükler süzülür.
   Sık geçen sözcük daha büyük ve belirgindir; imleç mercek gibi çalışır, yaklaşılan
   sözcükler büyüyüp okunur hale gelir ve en yakındakinin kaynağı altında görünür.
   Veriler data/site.json ve data/yayinlar.json dosyalarından okunur; panelden
   eklenen her yayın ve araç kendiliğinden alana katılır.
   Hareketi azaltma tercihi açık olan ziyaretçiye alan durağan çizilir. */
(function () {
  'use strict';

  var tuval = document.getElementById('korpus');
  var kapak = document.getElementById('cover');
  if (!tuval || !kapak || !window.fetch) return;
  var ctx = tuval.getContext('2d');
  var azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Türkçe, Almanca ve İngilizce için kısa bir durak sözcük listesi */
  var DURAK = ('ve ile bir için olarak bu da de gibi daha en çok olan olanlar ise ya veya hem ama fakat ancak kadar sonra önce üzerine üzerinde '
    + 'arasında arasındaki göre yönelik ilişkin dair yoluyla aracılığıyla tarafından içinde içindeki bunu buna şu her tüm bütün kendi '
    + 'nasıl neden olmak olması olduğu oldu eden etmek yapmak yapılan değil var yok gibi tek iki üç dört beş on yeni '
    + 'the and of in on for to with from a an as at by is are its into via toward towards '
    + 'der die das und den dem des ein eine einer eines im in zu zur zum mit von für auf als bei aus oder nicht ist sind').split(' ');
  var durak = {};
  DURAK.forEach(function (s) { durak[s] = true; });

  var sozcukler = [];   // { s, n, kaynak }
  var zerreler = [];
  var G = 0, Y = 0, dpr = 1;
  var fx = -9999, fy = -9999;
  var calisiyor = false, gorunur = true;

  function kucuk(s) { return String(s || '').toLocaleLowerCase('tr-TR'); }

  /* metni sözcüklere ayırır, her sözcüğün ilk görüldüğü kaynağı saklar */
  function topla(metin, kaynak, sayac) {
    String(metin || '').split(/[^0-9A-Za-zÇĞİÖŞÜçğıöşüâîûÄäßẞ]+/).forEach(function (w) {
      if (w.length < 4) return;
      var k = kucuk(w);
      if (durak[k] || /^\d+$/.test(k)) return;
      if (!sayac[k]) sayac[k] = { s: w, n: 0, kaynak: kaynak };
      sayac[k].n++;
    });
  }

  function hazirla(site, yayin) {
    var sayac = {};
    (yayin.makaleler || []).forEach(function (m) { topla(m.baslik, 'Makale · ' + m.yil, sayac); });
    (yayin.bolumler || []).forEach(function (m) { topla(m.baslik, 'Kitap bölümü · ' + m.yil, sayac); });
    ((site.arastirma || {}).alanlar || []).forEach(function (a) { topla(a.baslik + ' ' + a.metin, 'Araştırma alanı', sayac); });
    ((site.calismalar || {}).kartlar || []).forEach(function (k) { topla(k.baslik + ' ' + k.metin, 'Çalışma · ' + k.baslik, sayac); });
    ((site.kapak || {}).araclar || []).forEach(function (a) { topla(a.etiket + ' ' + (a.aciklama || a.baslik), 'Atölye · ' + a.etiket, sayac); });
    ((site.hakkinda || {}).paragraflar || []).forEach(function (p) { topla(p, 'Hakkımda', sayac); });
    var liste = Object.keys(sayac).map(function (k) { return sayac[k]; });
    liste.sort(function (a, b) { return b.n - a.n || a.s.length - b.s.length; });
    return liste.slice(0, 160);
  }

  function olcuAl() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    G = kapak.clientWidth;
    Y = kapak.clientHeight;
    tuval.width = Math.floor(G * dpr);
    tuval.height = Math.floor(Y * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function kur() {
    olcuAl();
    if (!sozcukler.length) return;
    var adet = G < 700 ? 36 : (G < 1200 ? 70 : 96);
    var enCok = sozcukler[0].n || 1;
    zerreler = [];
    for (var i = 0; i < adet; i++) {
      /* sık sözcükler alanda daha sık ve büyük görünür */
      var w = sozcukler[Math.floor(Math.pow(Math.random(), 1.8) * sozcukler.length)];
      var oran = Math.sqrt(w.n / enCok);
      zerreler.push({
        w: w,
        x: Math.random() * G,
        y: Math.random() * Y,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        b: 10 + oran * 18 + Math.random() * 3,
        o: 0.035 + oran * 0.1,
        serif: oran > 0.55,
        p: 0
      });
    }
  }

  function yaziTipi(z, b) {
    return z.serif ? 'italic 400 ' + b.toFixed(1) + 'px "Bodoni Moda", Georgia, serif'
      : '500 ' + b.toFixed(1) + 'px "IBM Plex Mono", monospace';
  }

  function ciz(adimla) {
    ctx.clearRect(0, 0, G, Y);
    var enYakin = null, enYakinU = 14400;
    for (var i = 0; i < zerreler.length; i++) {
      var z = zerreler[i];
      if (adimla) {
        z.x += z.vx; z.y += z.vy;
        if (z.x < -160) z.x = G + 40;
        if (z.x > G + 160) z.x = -40;
        if (z.y < -30) z.y = Y + 30;
        if (z.y > Y + 30) z.y = -30;
      }
      var dx = z.x - fx, dy = z.y - fy;
      var u2 = dx * dx + dy * dy;
      var hedef = u2 < 30000 ? 1 - u2 / 30000 : 0;
      z.p += (hedef - z.p) * (adimla ? 0.09 : 1);
      if (u2 < enYakinU && z.p > 0.3) { enYakinU = u2; enYakin = z; }

      var op = z.o + z.p * 0.7;
      var bo = z.b * (1 + z.p * 0.55);
      ctx.font = yaziTipi(z, bo);
      ctx.fillStyle = 'rgba(' + (200 + 44 * z.p).toFixed(0) + ',' + (236 - 22 * z.p).toFixed(0) + ',' + (226 - 70 * z.p).toFixed(0) + ',' + Math.min(op, 0.92).toFixed(3) + ')';
      ctx.fillText(z.w.s, z.x, z.y);
    }
    if (enYakin) {
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(214,164,74,0.85)';
      ctx.fillText(enYakin.w.kaynak.toLocaleUpperCase('tr-TR'), enYakin.x, enYakin.y + 16);
    }
  }

  function dongu() {
    if (!calismali()) { calisiyor = false; return; }
    ciz(true);
    requestAnimationFrame(dongu);
  }
  function calismali() { return gorunur && !kapak.classList.contains('gizli') && !document.hidden; }
  function baslat() {
    if (azHareket) { ciz(false); return; }
    if (calisiyor || !calismali()) return;
    calisiyor = true;
    requestAnimationFrame(dongu);
  }

  /* kapak görünmüyorsa (açılıp gizlendiğinde ya da sayfa aşağı kaydırıldığında) çizim durur */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (g) { gorunur = g[0].isIntersecting; baslat(); }).observe(kapak);
  }
  new MutationObserver(baslat).observe(kapak, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', baslat);

  var olcuZaman = null;
  window.addEventListener('resize', function () { clearTimeout(olcuZaman); olcuZaman = setTimeout(function () { kur(); baslat(); }, 150); }, { passive: true });
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var k = kapak.getBoundingClientRect();
    fx = e.clientX - k.left;
    fy = e.clientY - k.top;
    if (azHareket) ciz(false);
  }, { passive: true });
  kapak.addEventListener('pointerleave', function () { fx = fy = -9999; if (azHareket) ciz(false); });

  Promise.all([
    fetch('/data/site.json').then(function (r) { return r.json(); }),
    fetch('/data/yayinlar.json').then(function (r) { return r.json(); })
  ]).then(function (v) {
    sozcukler = hazirla(v[0] || {}, v[1] || {});
    kur();
    var basla = function () { kur(); baslat(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(basla); else basla();
  }).catch(function () { /* veri gelmezse kapak alansız kalır */ });
})();
