// bbasaran.net sayfa üreticisi
// index.html içindeki <!-- AD:BASLA --> ... <!-- AD:BITTI --> işaretli blokları
// data/site.json, data/yayinlar.json ve data/guncel.json içeriğinden yeniden üretir.
// Aylık güncelleyici (scripts/guncelle.mjs), elle üretim (scripts/uret.mjs)
// ve içerik paneli aynı modülü kullanır; sayfa hep aynı biçimde üretilir.

var KITAP_URL = 'https://kitap.bbasaran.net';

// HTML kaçışı: var olan varlıklara (&amp; gibi) dokunmaz.
function kacis(s) {
  return String(s == null ? '' : s)
    .replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function nitelik(s) {
  return kacis(s).replace(/"/g, '&quot;');
}

function iki(n) { return ('0' + n).slice(-2); }

/* ---------- kapak ---------- */
function kapak(k) {
  var satirlar = (k.bilgiler || []).map(function (b) {
    var akis = (b.satirlar || []).filter(function (s) { return String(s).trim(); });
    var ek = akis.length > 1 ? ' data-akis="' + nitelik(JSON.stringify(akis)) + '"' : '';
    return '      <li>\n'
      + '        <p class="fact-k">' + kacis(b.baslik) + '</p>\n'
      + '        <p class="fact-v"' + ek + '>' + kacis(akis[0] || '') + '</p>\n'
      + '      </li>';
  });
  return '    <p class="tagline" style="max-width:48ch"><b>' + kacis(k.unvan) + '</b><br>' + kacis(k.tanitim) + '</p>\n'
    + '\n'
    + '    <ul class="facts">\n'
    + satirlar.join('\n') + '\n'
    + '    </ul>';
}

/* ---------- hakkımda ---------- */
function hakkinda(h) {
  var p = (h.paragraflar || []).map(function (m, i) {
    return '    <p class="lede' + (i ? ' muted' : '') + ' reveal" style="--i:' + (i + 1) + '">' + kacis(m) + '</p>';
  });
  return ['    <h2 class="mask">' + kacis(h.baslik) + '</h2>'].concat(p).join('\n');
}

/* ---------- araştırma ---------- */
function arastirma(a) {
  var alanlar = (a.alanlar || []).map(function (x, i) {
    return '      <div class="field reveal" style="--i:' + i + '">\n'
      + '        <h3>' + kacis(x.baslik) + '</h3>\n'
      + '        <p>' + kacis(x.metin) + '</p>\n'
      + '      </div>';
  });
  return '    <h2 class="mask">' + kacis(a.baslik) + '</h2>\n'
    + '    <div class="grid two">\n'
    + alanlar.join('\n') + '\n'
    + '    </div>';
}

/* ---------- çalışmalar ---------- */
function calismalar(c) {
  var kartlar = c.kartlar || [];
  var html = kartlar.map(function (k, i) {
    var etiket = k.etiket
      ? '          <span class="chip' + (k.renk === 'sari' ? ' warn' : '') + '">' + kacis(k.etiket) + '</span>\n'
      : '';
    var bag = k.baglanti
      ? '          <a class="card-git" href="' + nitelik(k.baglanti) + '">' + kacis(k.baglantiMetni || 'Aç') + ' <span aria-hidden="true">→</span></a>\n'
      : '';
    return '        <article class="card">\n'
      + '          <p class="no">' + iki(i + 1) + '</p>\n'
      + '          <h3>' + kacis(k.baslik) + '</h3>\n'
      + '          <p>' + kacis(k.metin) + '</p>\n'
      + bag
      + etiket
      + '        </article>';
  });
  return '      <h2 class="mask">' + kacis(c.baslik) + '</h2>\n'
    + '    </div>\n'
    + '\n'
    + '    <div class="pin-rail" id="rail">\n'
    + '      <div class="pin-track" id="track">\n'
    + html.join('\n') + '\n'
    + '      </div>\n'
    + '    </div>\n'
    + '\n'
    + '    <div class="pin-meter">\n'
    + '      <span>Kaydırarak gezin</span>\n'
    + '      <span class="track"><span class="fill" id="pinfill"></span></span>\n'
    + '      <span>' + iki(kartlar.length) + '</span>\n'
    + '    </div>';
}

/* ---------- yöntem ---------- */
// Madde metninde [[terim]] yazımı vurgulu terim (sk-kod) olarak gösterilir.
function vurgula(s) {
  return kacis(s).replace(/\[\[([\s\S]+?)\]\]/g, '<span class="sk-kod">$1</span>');
}

function yontem(y) {
  var sekmeler = (y.sekmeler || []).slice(0, 4);
  var radyo = sekmeler.map(function (s, i) {
    return '      <input type="radio" name="sekme" id="sk' + (i + 1) + '"' + (i ? '' : ' checked') + '>';
  });
  var etiketler = sekmeler.map(function (s, i) {
    return '        <label for="sk' + (i + 1) + '">' + kacis(s.ad) + '</label>';
  });
  var paneller = sekmeler.map(function (s, i) {
    var maddeler = (s.maddeler || []).map(function (m) {
      return '          <li>\n'
        + '            <span class="sk-t">' + kacis(m.baslik) + '</span>\n'
        + '            <span class="sk-d">' + vurgula(m.metin) + '</span>\n'
        + '          </li>';
    });
    return '      <div class="sk-panel" data-p="' + (i + 1) + '">\n'
      + '        <ul>\n'
      + maddeler.join('\n') + '\n'
      + '        </ul>\n'
      + '      </div>';
  });
  return '    <h2 class="mask">' + kacis(y.baslik) + '</h2>\n'
    + '\n'
    + '    <div class="sekmeler reveal" style="--i:1">\n'
    + radyo.join('\n') + '\n'
    + '\n'
    + '      <div class="sk-liste">\n'
    + etiketler.join('\n') + '\n'
    + '      </div>\n'
    + '\n'
    + paneller.join('\n\n') + '\n'
    + '    </div>';
}

/* ---------- yayınlar ---------- */
function yayinSatiri(k) {
  var yazar = k.yazarlar ? k.yazarlar + ' · ' : '';
  var kaynak = k.kaynak ? '<em>' + kacis(k.kaynak) + '</em>' : '';
  var ayrinti = k.ayrinti ? ', ' + kacis(k.ayrinti) : '';
  var dizin = k.dizin
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

function yayinGrubu(baslik, liste) {
  var sirali = (liste || []).slice().sort(function (a, b) { return b.yil - a.yil; });
  return '    <div class="pubgroup">\n'
    + '      <h3>' + baslik + ' <span class="count">' + sirali.length + '</span></h3>\n'
    + '      <ol class="pubs">\n'
    + sirali.map(yayinSatiri).join('\n') + '\n'
    + '      </ol>\n'
    + '    </div>';
}

function yayinlar(y) {
  return yayinGrubu('Makaleler', y.makaleler) + '\n\n' + yayinGrubu('Kitap bölümleri', y.bolumler);
}

/* ---------- güncel çağrı bandı ---------- */
function bant(guncel) {
  var kitap = guncel && guncel.kitap;
  if (!kitap) return '';
  var metin = '<b>' + kacis(kitap) + '</b> · Kitap bölümü çağrısı · '
    + 'Ayrıntılar ve başvuru için tıklayın <span class="ok">→</span> &nbsp;&nbsp;·&nbsp;&nbsp; ';
  return '  <a class="bant" href="' + KITAP_URL + '">\n'
    + '    <span class="bant-et">Güncel çağrı</span>\n'
    + '    <span class="bant-akis">\n'
    + '      <span>' + metin + '</span>\n'
    + '      <span aria-hidden="true">' + metin + '</span>\n'
    + '    </span>\n'
    + '  </a>';
}

/* ---------- iletişim ---------- */
function iletisim(i) {
  return '    <h2 class="mask">' + kacis(i.baslik) + '</h2>\n'
    + '    <p class="lede muted reveal" style="--i:1">' + kacis(i.aciklama) + '</p>';
}

function konular(i) {
  return (i.konular || []).map(function (k) { return '          <option>' + kacis(k) + '</option>'; }).join('\n');
}

function bilgiler(i) {
  return (i.bilgiler || []).map(function (b) {
    return '      <div><dt>' + kacis(b.baslik) + '</dt><dd>' + kacis(b.deger) + '</dd></div>';
  }).join('\n');
}

/* ---------- blok değiştirme ---------- */
function blokDegistir(html, ad, icerik) {
  var bas = '<!-- ' + ad + ':BASLA -->';
  var son = '<!-- ' + ad + ':BITTI -->';
  var i = html.indexOf(bas);
  var j = html.indexOf(son);
  if (i < 0 || j < 0 || j < i) throw new Error('İşaret bulunamadı: ' + ad);
  return html.slice(0, i + bas.length) + '\n' + icerik + '\n' + html.slice(j);
}

// Tüm blokları verilerden yeniden üretir. Eksik veri olan blok olduğu gibi kalır.
function sayfayiUret(html, veri) {
  var s = veri.site;
  if (s) {
    html = blokDegistir(html, 'KAPAK', kapak(s.kapak || {}));
    html = blokDegistir(html, 'HAKKINDA', hakkinda(s.hakkinda || {}));
    html = blokDegistir(html, 'ARASTIRMA', arastirma(s.arastirma || {}));
    html = blokDegistir(html, 'CALISMALAR', calismalar(s.calismalar || {}));
    html = blokDegistir(html, 'YONTEM', yontem(s.yontem || {}));
    html = blokDegistir(html, 'YAYINNOTU', '    <p class="pubnote reveal">' + kacis((s.yayinlar || {}).not) + '</p>');
    html = blokDegistir(html, 'ILETISIM', iletisim(s.iletisim || {}));
    html = blokDegistir(html, 'KONULAR', konular(s.iletisim || {}));
    html = blokDegistir(html, 'BILGILER', bilgiler(s.iletisim || {}));
  }
  if (veri.yayinlar) html = blokDegistir(html, 'YAYINLAR', yayinlar(veri.yayinlar));
  if (veri.guncel) html = blokDegistir(html, 'GUNCEL', bant(veri.guncel));
  return html;
}

module.exports = {
  kacis: kacis,
  blokDegistir: blokDegistir,
  sayfayiUret: sayfayiUret,
  yayinlar: yayinlar,
  bant: bant,
  KITAP_URL: KITAP_URL
};
