/* bbasaran.net Atölye
   Araçlar, ana sayfadaki kutularla aynı kayıttan (data/site.json, kapak.araclar)
   okunur; panelden yapılan her değişiklik burada da görünür.
   Görünümler: Akış (perspektifte kart yığını, telefonda kaydırmalı şerit),
   Yakından (tek araç: deney ya da tanıtım), Izgara (hepsi bir arada).
   Bir araca doğrudan bağlantı: /atolye/#tez-atlasi */
(function () {
  'use strict';

  var kok = document.documentElement;
  var sahne = document.getElementById('atSahne');
  var araKutusu = document.getElementById('atAra');
  var azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dar = window.matchMedia('(max-width: 860px)');
  var dokunmatik = window.matchMedia('(hover: none)');
  /* bbasaran.net/atolye/ kendi sayfası mı, yoksa ana sayfadaki Atölye bölümü mü */
  var bagimsiz = document.body.classList.contains('at-govde');

  var KATEGORI = { ogrenci: 'Öğrenciler için', arastirma: 'Araştırma', etkinlik: 'Etkinlik ve yayın' };
  var MANSET = {
    hepsi: ['Araştırmanın altyapısı', null],
    ogrenci: ['Öğrenciler için', 'Sor, konuş, dene.'],
    arastirma: ['Araştırma', 'Veriyi konuştur.'],
    etkinlik: ['Etkinlik ve yayın', 'Kongreden kitaba.']
  };

  var durum = { araclar: [], gorunum: 'akis', kategori: 'hepsi', ara: '', sira: 0, ilgi: null, deney: {} };

  /* ---------- yardımcılar ---------- */
  function el(ad, nit, cocuklar) {
    var e = document.createElement(ad);
    if (nit) Object.keys(nit).forEach(function (k) {
      var v = nit[k];
      if (v == null || v === false) return;
      if (k === 'text') e.textContent = v;
      else if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v; // yalnızca sabit, veri içermeyen çizimler için
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    (cocuklar || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function sayiAdi(n) {
    var a = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on', 'on bir', 'on iki', 'on üç', 'on dört', 'on beş', 'on altı', 'on yedi', 'on sekiz', 'on dokuz', 'yirmi'];
    return a[n] || String(n);
  }
  function buyukHarf(s) { return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1); }
  function iki(n) { return (n < 10 ? '0' : '') + n; }
  function kucuk(s) { return String(s || '').toLocaleLowerCase('tr-TR'); }
  function kisaAd(s) {
    var m = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
    return kucuk(s).replace(/[çğıöşüâîû]/g, function (h) { return m[h]; }).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'arac';
  }
  function alanAdi(u) {
    try { var x = new URL(u, location.href); return x.host === location.host ? x.pathname : x.host + (x.pathname === '/' ? '' : x.pathname.replace(/\/$/, '')); }
    catch (e) { return u; }
  }

  /* ---------- ölçüm (ana sayfayla aynı ilkeler: çerez yok, Do Not Track'e uyulur) ---------- */
  var olcumKapali = navigator.doNotTrack === '1' || window.doNotTrack === '1';
  function oturum() {
    try {
      var o = sessionStorage.getItem('bb_oturum');
      if (!o) { o = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('bb_oturum', o); }
      return o;
    } catch (e) { return ''; }
  }
  function olay(tur, deger) {
    if (olcumKapali) return;
    var g = window.innerWidth || 0;
    var govde = JSON.stringify({ tur: tur, deger: deger || null, kaynak: '', etiket: '', cihaz: g < 700 ? 'telefon' : (g < 1050 ? 'tablet' : 'masaustu'), oturum: oturum() });
    try { if (navigator.sendBeacon && navigator.sendBeacon('/api/olay', new Blob([govde], { type: 'application/json' }))) return; } catch (e) {}
    try { fetch('/api/olay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: govde, keepalive: true }); } catch (e) {}
  }

  /* ---------- çizimler (sabit biçimler, veri içermez) ---------- */
  function cizim(tur, kategori, canli) {
    var ic = '';
    var i, s = [];
    switch (tur) {
      case 'arsi':
        [18, 30, 44, 26, 52, 36, 60, 40, 54, 28, 46, 24, 34, 16].forEach(function (h, k) { s.push('<i style="height:' + h + 'px;animation-delay:' + (k * 0.08).toFixed(2) + 's"></i>'); });
        ic = '<div class="c cz-arsi">' + s.join('') + '</div>'; break;
      case 'daf':
        ic = '<div class="c cz-daf"><span lang="de">Wie war dein Wochenende?</span><span class="b" lang="de">Ich bin nach Berlin gefahren.</span><span class="y"><i></i><i></i><i></i></span></div>'; break;
      case 'yontem':
        ic = '<div class="c cz-yontem">'
          + '<i class="h" style="left:25%;top:36%;width:32%;transform:rotate(-14deg)"></i>'
          + '<i class="h" style="left:25%;top:36%;width:28%;transform:rotate(38deg)"></i>'
          + '<i class="h" style="left:56%;top:28%;width:22%;transform:rotate(60deg);opacity:.5"></i>'
          + '<i class="d dolu" style="left:21%;top:30%"></i><i class="d" style="left:54%;top:22%"></i>'
          + '<i class="d" style="left:45%;top:60%;animation-delay:.6s"></i><i class="d" style="left:66%;top:55%;border-style:dashed;animation-delay:1.2s"></i></div>'; break;
      case 'biblio':
        var tohum = 5;
        var r = function () { tohum = (tohum * 16807) % 2147483647; return (tohum - 1) / 2147483646; };
        for (i = 0; i < 22; i++) {
          var b = 3 + Math.round(r() * 7);
          s.push('<i class="' + (i % 7 === 0 ? 'v' : '') + '" style="left:' + (15 + r() * 70).toFixed(1) + '%;top:' + (20 + r() * 60).toFixed(1) + '%;width:' + b + 'px;height:' + b + 'px;opacity:' + (0.35 + r() * 0.65).toFixed(2) + ';animation-delay:' + (r() * 2).toFixed(1) + 's"></i>');
        }
        ic = '<div class="c cz-biblio">' + s.join('') + '</div>'; break;
      case 'ilan':
        ic = '<div class="c cz-ilan"><i class="k"></i><i class="n"></i><i class="n b"></i></div>'; break;
      case 'takvim':
        for (i = 0; i < 21; i++) s.push('<i class="' + (i === 11 ? 'on' : (i === 12 || i === 13 ? 'yan' : '')) + '"></i>');
        ic = '<div class="c cz-takvim">' + s.join('') + '</div>'; break;
      case 'kitap':
        ic = '<div class="c cz-kitap"><i style="height:70px"></i><i class="a" style="height:84px"></i><i class="r" style="height:62px"></i><i class="e" style="height:76px"></i></div>'; break;
      case 'halka':
        for (i = 0; i < 7; i++) {
          var a = i / 7 * Math.PI * 2;
          s.push('<i class="' + (i % 3 === 0 ? 'd' : (i % 3 === 2 ? 'y' : '')) + '" style="left:' + (50 + 40 * Math.cos(a)).toFixed(1) + '%;top:' + (50 + 40 * Math.sin(a)).toFixed(1) + '%"></i>');
        }
        ic = '<div class="c cz-halka">' + s.join('') + '</div>'; break;
      default:
        [30, 48, 40, 70, 62, 100].forEach(function (h, k) { s.push('<i style="height:' + h + '%;animation-delay:' + (k * 0.2).toFixed(1) + 's"></i>'); });
        ic = '<div class="c cz-tez">' + s.join('') + '</div>';
    }
    if (canli) ic += '<span class="canli">CANLI</span>';
    return el('div', { class: 'at-cizim ' + kategori, 'aria-hidden': 'true', html: ic });
  }

  /* ---------- veri ---------- */
  function hazirla(site) {
    var liste = ((site.kapak || {}).araclar || []).filter(function (x) { return String(x.baglanti || '').trim(); });
    var kullanilan = {};
    return liste.map(function (x, i) {
      var id = kisaAd(x.etiket);
      while (kullanilan[id]) id += '-' + (i + 1);
      kullanilan[id] = true;
      return {
        id: id,
        no: iki(i + 1),
        ad: x.etiket || 'Adsız araç',
        baslik: x.baslik || '',
        aciklama: x.aciklama || x.baslik || '',
        baglanti: String(x.baglanti).trim(),
        dugme: x.dugme || 'Aç',
        kategori: KATEGORI[x.kategori] ? x.kategori : 'ogrenci',
        cizim: x.cizim || 'tez',
        deney: x.deney || '',
        yapim: x.durum === 'yapim'
      };
    });
  }

  function gorunenler() {
    var q = kucuk(durum.ara.trim());
    return durum.araclar.filter(function (a) {
      if (durum.kategori !== 'hepsi' && a.kategori !== durum.kategori) return false;
      if (!q) return true;
      return kucuk(a.ad + ' ' + a.baslik + ' ' + a.aciklama).indexOf(q) >= 0;
    });
  }

  function ilgiDizisi(a) {
    var d = durum.ilgi && durum.ilgi.araclar && durum.ilgi.araclar[a.ad];
    if (!d) return null;
    var top = d.reduce(function (t, x) { return t + x; }, 0);
    return top > 0 ? d : null;
  }

  /* ---------- parçalar ---------- */
  function noktali(a) {
    return el('span', { class: 'at-durum' }, [
      el('span', { class: 'at-nokta' + (a.yapim ? ' yapim' : ''), 'aria-hidden': 'true' }),
      (a.yapim ? 'Yapım aşamasında · ' : '') + alanAdi(a.baglanti)
    ]);
  }

  function ilgiCubugu(a) {
    var d = ilgiDizisi(a);
    if (!d) return null;
    var en = Math.max.apply(null, d) || 1;
    var cubuk = el('span', { class: 'at-ilgi-cubuk', 'aria-hidden': 'true' });
    d.forEach(function (v, k) {
      cubuk.appendChild(el('span', { style: 'height:' + Math.round(4 + v / en * 20) + 'px;animation-delay:' + (k * 0.05).toFixed(2) + 's' }));
    });
    var top = d.reduce(function (t, x) { return t + x; }, 0);
    return el('span', { class: 'at-ilgi' }, [cubuk, el('small', { text: 'Son 7 gün · bu siteden ' + top + ' tıklama' })]);
  }

  function gitDugmesi(a, dolu) {
    return el('a', {
      class: 'at-dugme' + (dolu ? ' dolu' : ''), href: a.baglanti,
      onclick: function () { olay('tiklama', ('Atölye: ' + a.ad).slice(0, 60)); }
    }, [a.dugme, ' ', el('span', { 'aria-hidden': 'true', text: '→' })]);
  }

  function kart(a, i, onTik) {
    return el('button', { type: 'button', class: 'at-kart', 'data-i': i, 'aria-label': a.ad, onclick: onTik }, [
      cizim(a.cizim, a.kategori, !a.yapim),
      el('span', { class: 'at-kart-ad' }, [el('b', { text: a.ad }), el('i', { text: a.no })]),
      el('span', { class: 'at-kart-alt', text: KATEGORI[a.kategori] + (a.yapim ? ' · yapım aşamasında' : '') })
    ]);
  }

  /* ---------- AKIŞ ---------- */
  function yiginKonumu(k) {
    if (k === 0) return { t: 'translate3d(30px,210px,0) rotateY(-6deg) scale(1.04)', o: 1, z: 60 };
    if (k > 0) return { t: 'translate3d(' + (30 + k * 165) + 'px,' + (210 + k * 55) + 'px,' + (-k * 120) + 'px) rotateY(-24deg) rotateX(4deg)', o: k > 3 ? 0.55 : 1, z: 60 - k, f: 'saturate(' + Math.max(0.4, 1 - k * 0.18).toFixed(2) + ')' };
    return { t: 'translate3d(' + (30 + k * 230) + 'px,' + (210 - k * 10) + 'px,' + (k * 160) + 'px) rotateY(28deg)', o: Math.max(0, 1 + k * 0.5), z: 60 + k, f: 'saturate(.6)' };
  }

  function akisCiz(liste) {
    var m = MANSET[durum.kategori];
    var manset = el('div', { class: 'at-manset', 'aria-hidden': 'true' }, [
      el('small', { text: m[0] }),
      el('span', { text: m[1] || ('Bir atölye, ' + sayiAdi(durum.araclar.length) + ' araç.') })
    ]);
    var ic = el('div', { class: 'at-yigin-ic' });
    var kartlar = liste.map(function (a, i) {
      var k = kart(a, i, function () {
        if (i === durum.sira) gorunumSec('yakin');
        else { durum.sira = i; akisGuncelle(liste, kartlar, kunyeKap, true); }
      });
      ic.appendChild(k);
      return k;
    });
    var yigin = el('div', { class: 'at-yigin' }, [ic]);
    var kunyeKap = el('div', { class: 'at-kunye-kap', style: 'display:contents' });
    var kap = el('div', { class: 'at-akis' }, [manset, yigin, kunyeKap]);

    /* telefonda: kaydırınca ortadaki kart seçili sayılır */
    var zaman = null;
    ic.addEventListener('scroll', function () {
      if (!dar.matches) return;
      clearTimeout(zaman);
      zaman = setTimeout(function () {
        var orta = ic.scrollLeft + ic.clientWidth / 2, enYakin = 0, fark = Infinity;
        kartlar.forEach(function (k, i) {
          var f = Math.abs(k.offsetLeft + k.offsetWidth / 2 - orta);
          if (f < fark) { fark = f; enYakin = i; }
        });
        if (enYakin !== durum.sira) { durum.sira = enYakin; akisGuncelle(liste, kartlar, kunyeKap, false); }
      }, 90);
    }, { passive: true });

    /* masaüstünde: imleç bir kartın üzerinde durunca o kart öne gelir.
       Kartlar yer değiştirince imlecin altına başka kart girebilir; zincirleme
       değişim olmasın diye her değişimden sonra kısa bir kilit ve imlecin
       biraz hareket etmesi beklenir. */
    var kilit = 0, imX = 0, imY = 0, sonX = -999, sonY = -999, bekleyen = null;
    function oneGetir(i) {
      if (i === durum.sira || i < 0 || i >= kartlar.length) return false;
      durum.sira = i;
      kilit = Date.now() + 480;
      sonX = imX; sonY = imY;
      akisGuncelle(liste, kartlar, kunyeKap, false);
      return true;
    }
    yigin.addEventListener('mousemove', function (e) { imX = e.clientX; imY = e.clientY; });
    kartlar.forEach(function (k, i) {
      k.addEventListener('mouseenter', function () {
        if (dar.matches || dokunmatik.matches) return;
        clearTimeout(bekleyen);
        bekleyen = setTimeout(function () {
          if (Date.now() < kilit) return;
          if (Math.abs(imX - sonX) + Math.abs(imY - sonY) < 24) return;
          if (k.matches(':hover')) oneGetir(i);
        }, 140);
      });
      k.addEventListener('mouseleave', function () { clearTimeout(bekleyen); });
    });
    /* tekerlekle kaydırınca sıradaki kart öne gelir; son karta gelince
       tekerlek yeniden sayfayı kaydırır (ana sayfada sayfayı çevirir) */
    var teker = 0, tekerZaman = 0;
    yigin.addEventListener('wheel', function (e) {
      if (dar.matches) return;
      var d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      var yon = d > 0 ? 1 : -1;
      var hedef = durum.sira + yon;
      if (hedef < 0 || hedef >= kartlar.length) return;
      e.preventDefault();
      e.stopPropagation();
      var simdi = Date.now();
      if (simdi - tekerZaman > 220) teker = 0;
      tekerZaman = simdi;
      teker += Math.abs(d);
      if (teker < 40 || simdi < kilit - 200) return;
      teker = 0;
      oneGetir(hedef);
    }, { passive: false });

    sahne.appendChild(kap);
    akisGuncelle(liste, kartlar, kunyeKap, false);
    if (dar.matches && kartlar[durum.sira]) {
      requestAnimationFrame(function () { ic.scrollLeft = kartlar[durum.sira].offsetLeft - (ic.clientWidth - kartlar[durum.sira].offsetWidth) / 2; });
    }
  }

  function akisGuncelle(liste, kartlar, kunyeKap, kaydir) {
    kartlar.forEach(function (k, i) {
      var f = i - durum.sira;
      var p = yiginKonumu(f);
      var gizli = f > 4 || f < -2;
      k.style.transform = p.t;
      k.style.opacity = gizli ? 0 : p.o.toFixed(2);
      k.style.zIndex = p.z;
      k.style.filter = p.f || '';
      k.style.pointerEvents = gizli ? 'none' : 'auto';
      k.tabIndex = gizli ? -1 : 0;
      k.classList.toggle('on', f === 0);
    });
    if (kaydir && dar.matches && kartlar[durum.sira]) kartlar[durum.sira].scrollIntoView({ behavior: azHareket ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    var a = liste[durum.sira];
    kunyeKap.innerHTML = '';
    if (a) kunyeKap.appendChild(el('aside', { class: 'at-kunye', 'aria-label': a.ad + ' künyesi' }, [
      el('div', { class: 'at-kunye-ust' }, [el('span', { text: a.no + ' / ' + iki(durum.araclar.length) }), el('span', { text: KATEGORI[a.kategori] })]),
      el('h2', { text: a.ad }),
      el('p', { text: a.aciklama }),
      noktali(a),
      ilgiCubugu(a),
      el('div', { class: 'at-dugmeler' }, [
        el('button', { type: 'button', class: 'at-dugme dolu', onclick: function () { gorunumSec('yakin'); } }, [a.deney ? 'Deneyi aç' : 'Yakından bak']),
        gitDugmesi(a, false)
      ])
    ]));
    sayacGuncelle(liste);
  }

  /* ---------- YAKINDAN ---------- */
  var DENEYLER = {
    daf: {
      etiket: 'Deney · örnek diyalog',
      baslik: ['Sor. Konuş.', 'Düzelt.'],
      ipucu: 'Düzeyi değiştirin; asistanın sorusu dil düzeyine göre karmaşıklaşır. Bu bir örnektir; asıl konuşma araçta gerçek zamanlı olur.',
      kontrol: { ad: 'DÜZEY', en: 3, bas: 2, goster: function (v) { return ['A2', 'B1', 'B2', 'C1'][v]; } },
      sahne: function (v) {
        var Y = [
          'Schön! Was hast du in Ankara gemacht?',
          'Schön! Was habt ihr in Ankara besichtigt?',
          'Klingt gut! Was hat dir an Ankara am besten gefallen, und warum?',
          'Spannend! Inwiefern hat die Reise dein Bild von Ankara verändert?'
        ];
        return el('div', { class: 'at-diyalog' }, [
          el('span', { class: 'o', lang: 'de', text: 'Was hast du am Wochenende gemacht?' }),
          el('span', { class: 'ben', lang: 'de', text: 'Ich bin mit meinem Bruder nach Ankara gefahren.' }),
          el('span', { class: 'o yeni', lang: 'de', text: Y[v] })
        ]);
      },
      panel: function (v) { return ['düzey: ' + ['A2', 'B1', 'B2', 'C1'][v] + '   rol: konuşma ortağı   konu: hafta sonu', 'geri bildirim: Perfekt (sein + gefahren) doğru kullanıldı']; }
    },
    arsi2209: {
      etiket: 'Deney · örnek sokratik akış',
      baslik: ['Merak et,', 'netleştir.'],
      ipucu: 'Adımları ilerletin; araç bulanık bir merakı soru soru bir araştırma planına çevirir. Sorular örnektir; asıl söyleşi öğrencinin yanıtlarına göre şekillenir.',
      kontrol: { ad: 'ADIM', en: 5, bas: 1, en0: 1, goster: function (v) { return v + ' / 5'; } },
      sahne: function (v) {
        var A = ['MERAK', 'ODAK', 'SORU', 'YÖNTEM', 'PLAN'];
        var S = ['Son zamanlarda bir derste seni en çok ne şaşırttı?', 'Bu şaşkınlık kimin, hangi sınıfın sorunu?', 'Bunu tek bir soruyla sorsan nasıl sorardın?', 'Bu soruya hangi veriyle yanıt verebilirsin?', 'Önümüzdeki dört haftada ilk adımın ne olacak?'];
        var serit = el('div', { class: 'at-adim-serit', 'aria-hidden': 'true' });
        A.forEach(function (x, k) { serit.appendChild(el('i', { class: k < v ? 'on' : '' })); });
        return el('div', { class: 'at-adim' }, [serit, el('small', { text: 'ADIM ' + v + ' / 5 · ' + A[v - 1] }), el('q', { text: S[v - 1] })]);
      },
      panel: function (v) { return ['oturum: sesli söyleşi, yaklaşık 5 ila 10 dakika', 'çıktı: araştırma tasarımı özeti (PDF, oturum sonunda)']; }
    }
  };

  function yakinCiz(liste) {
    var a = liste[durum.sira];
    if (!a) return bosCiz();
    var d = DENEYLER[a.deney];
    var deneyKutusu = el('div', { class: 'at-deney ' + a.kategori });
    var yan = el('div', { class: 'at-yan' });
    var panel = el('div', { class: 'at-panel' });

    function panelYaz(satirlar, ornek) {
      panel.innerHTML = '';
      panel.appendChild(el('div', { class: 'at-panel-ust' }, [el('span', { text: '● KÜNYE' }), el('span', { text: ornek ? 'DENEYDEKİ İÇERİK ÖRNEKTİR' : '' })]));
      satirlar.forEach(function (s) { panel.appendChild(el('div', { text: s })); });
    }
    var kunyeSatirlari = [
      'adres: ' + alanAdi(a.baglanti),
      'kategori: ' + KATEGORI[a.kategori] + '   durum: ' + (a.yapim ? 'Yapım aşamasında' : 'Aktif')
    ];

    if (d) {
      var v = durum.deney[a.id] != null ? durum.deney[a.id] : d.kontrol.bas;
      var ciz = function () {
        deneyKutusu.innerHTML = '';
        deneyKutusu.appendChild(el('span', { class: 'at-deney-et', text: d.etiket }));
        deneyKutusu.appendChild(d.sahne(v));
        panelYaz(kunyeSatirlari.concat(d.panel(v)), true);
      };
      var gosterge = el('b', { text: d.kontrol.goster(v) });
      var surgu = el('input', { type: 'range', min: d.kontrol.en0 || 0, max: d.kontrol.en, step: 1, value: v, 'aria-label': d.kontrol.ad,
        oninput: function () { v = Number(surgu.value); durum.deney[a.id] = v; gosterge.textContent = d.kontrol.goster(v); ciz(); } });
      ciz();
      yan.appendChild(el('h2', {}, [d.baslik[0] + ' ', el('i', { text: d.baslik[1] })]));
      yan.appendChild(el('p', { text: d.ipucu }));
      yan.appendChild(el('label', { class: 'at-kontrol' }, [el('span', {}, [d.kontrol.ad, gosterge]), surgu]));
    } else {
      deneyKutusu.appendChild(el('span', { class: 'at-deney-et', text: 'Tanıtım' }));
      deneyKutusu.appendChild(cizim(a.cizim, '', !a.yapim));
      yan.appendChild(el('h2', { text: a.ad }));
      panelYaz(kunyeSatirlari, false);
    }
    yan.appendChild(el('p', { text: a.aciklama }));
    yan.appendChild(noktali(a));
    var ilgi = ilgiCubugu(a);
    if (ilgi) yan.appendChild(ilgi);
    yan.appendChild(el('div', { class: 'at-dugmeler' }, [gitDugmesi(a, true)]));

    sahne.appendChild(el('div', { class: 'at-yakin' }, [
      el('div', { class: 'at-yakin-ust' }, [
        el('span', { text: a.no + ' / ' + a.ad }),
        el('button', { type: 'button', class: 'at-ok', 'aria-label': 'Akışa dön', onclick: function () { gorunumSec('akis'); }, text: '×' })
      ]),
      el('div', { class: 'at-yakin-govde' }, [deneyKutusu, yan]),
      panel
    ]));
    sayacGuncelle(liste);
    if (bagimsiz) { try { history.replaceState(null, '', '#' + a.id); } catch (e) {} }
  }

  /* ---------- IZGARA ---------- */
  function izgaraCiz(liste) {
    var ic = el('div', { class: 'at-izgara-ic' });
    liste.forEach(function (a, i) {
      ic.appendChild(kart(a, i, function () { durum.sira = i; gorunumSec('yakin'); }));
    });
    sahne.appendChild(el('div', { class: 'at-izgara' }, [
      el('h2', {}, [buyukHarf(sayiAdi(durum.araclar.length)) + ' araç. ', el('i', { text: 'Tek atölye.' })]),
      ic
    ]));
    sayacGuncelle(liste);
  }

  function bosCiz() {
    sahne.appendChild(el('p', { class: 'at-yukleniyor', text: 'Bu aramayla eşleşen araç yok.' }));
    sayacGuncelle([]);
  }

  /* ---------- denetim ---------- */
  function sayacGuncelle(liste) {
    document.getElementById('atSayac').textContent = (liste.length ? iki(durum.sira + 1) : '00') + ' / ' + iki(liste.length);
    document.getElementById('atOnceki').disabled = durum.sira <= 0;
    document.getElementById('atSonraki').disabled = durum.sira >= liste.length - 1;
  }

  function ciz() {
    var liste = gorunenler();
    if (durum.sira > liste.length - 1) durum.sira = Math.max(0, liste.length - 1);
    sahne.innerHTML = '';
    if (!liste.length) return bosCiz();
    if (durum.gorunum === 'yakin') yakinCiz(liste);
    else if (durum.gorunum === 'izgara') izgaraCiz(liste);
    else akisCiz(liste);
    if (bagimsiz && durum.gorunum !== 'yakin') { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  }

  function gorunumSec(g) {
    durum.gorunum = g;
    Array.prototype.forEach.call(document.querySelectorAll('[data-gorunum]'), function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-gorunum') === g)); });
    ciz();
    if (g === 'yakin') olay('bolum', 'atolye-yakindan', false);
  }

  function kategoriSec(k) {
    durum.kategori = k;
    durum.sira = 0;
    Array.prototype.forEach.call(document.querySelectorAll('[data-kategori]'), function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-kategori') === k)); });
    ciz();
  }

  function adim(yon) {
    var liste = gorunenler();
    var yeni = Math.max(0, Math.min(liste.length - 1, durum.sira + yon));
    if (yeni === durum.sira) return;
    durum.sira = yeni;
    ciz();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-gorunum]'), function (b) {
    b.addEventListener('click', function () { gorunumSec(b.getAttribute('data-gorunum')); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-kategori]'), function (b) {
    b.addEventListener('click', function () { kategoriSec(b.getAttribute('data-kategori')); });
  });
  document.getElementById('atOnceki').addEventListener('click', function () { adim(-1); });
  document.getElementById('atSonraki').addEventListener('click', function () { adim(1); });
  var araZaman = null;
  araKutusu.addEventListener('input', function () {
    clearTimeout(araZaman);
    araZaman = setTimeout(function () { durum.ara = araKutusu.value; durum.sira = 0; ciz(); }, 120);
  });
  /* sahnedeyken sol ve sağ ok tuşları araçlar arasında gezdirir */
  sahne.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); adim(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); adim(-1); }
  });
  var olcuZaman = null;
  dar.addEventListener ? dar.addEventListener('change', function () { clearTimeout(olcuZaman); olcuZaman = setTimeout(ciz, 80); }) : null;

  /* tema: ana sayfadaki düğmeyle aynı davranış */
  var tema = bagimsiz ? document.getElementById('theme') : null;
  if (tema) tema.addEventListener('click', function () {
    var cur = kok.getAttribute('data-theme');
    var koyu = cur === 'dark' || (!cur && window.matchMedia('(prefers-color-scheme: dark)').matches);
    kok.setAttribute('data-theme', koyu ? 'light' : 'dark');
  });

  /* kapaktaki Atölye kutusu: ana sayfa kitap gibi çevrildiğinde menüdeki
     Atölye bağlantısına tıklamış gibi davranır; öbür durumda bağlantı
     sayfayı #atolye bölümüne kaydırır */
  if (!bagimsiz) document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a.arac-atolye') : null;
    if (!a || !kok.classList.contains('kitap')) return;
    var menu = document.querySelector('nav.bar a[href="#atolye"]');
    if (!menu) return;
    e.preventDefault();
    menu.click();
  });

  /* kapaktaki korpus alanı bir araç sözcüğüne tıklanınca o aracı yakından açar */
  window.bbAtolye = {
    ac: function (ad) {
      var i = durum.araclar.map(function (a) { return a.ad; }).indexOf(ad);
      if (i < 0) return;
      durum.ara = ''; if (araKutusu) araKutusu.value = '';
      kategoriSec('hepsi');
      durum.sira = i;
      gorunumSec('yakin');
    }
  };

  /* ---------- yükleme ---------- */
  fetch('/data/site.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (site) {
    durum.araclar = hazirla(site);
    document.getElementById('atRozet').textContent = iki(durum.araclar.length);
    var sayi = document.getElementById('atSayi');
    if (sayi) sayi.textContent = '· ' + iki(durum.araclar.length) + ' araç';
    var hedef = bagimsiz ? (location.hash || '').slice(1) : '';
    if (hedef) {
      var i = durum.araclar.map(function (a) { return a.id; }).indexOf(hedef);
      if (i >= 0) { durum.sira = i; durum.gorunum = 'yakin'; }
    }
    gorunumSec(durum.gorunum);
    if (bagimsiz) olay('bolum', 'atolye');
    /* ilgi özeti gelince yeniden çizilir; gelmezse çubuklar görünmez */
    fetch('/api/atolye').then(function (r) { return r.ok ? r.json() : null; }).then(function (ilgi) {
      if (ilgi && ilgi.araclar && Object.keys(ilgi.araclar).length) { durum.ilgi = ilgi; ciz(); }
    }).catch(function () {});
  }).catch(function () {
    sahne.innerHTML = '';
    sahne.appendChild(el('p', { class: 'at-yukleniyor' }, ['Araçlar yüklenemedi. Araçlara ', el('a', { href: '/', text: 'ana sayfadaki' }), ' kutulardan ulaşabilirsiniz.']));
  });
})();
