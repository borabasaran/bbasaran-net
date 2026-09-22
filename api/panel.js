// bbasaran.net içerik paneli: sunucu tarafı.
// Şifre (PANEL_SIFRESI) ve GitHub anahtarı (GITHUB_TOKEN) yalnızca Vercel ortam değişkenlerinde durur.
// Kaydetme: veri dosyaları ve yeniden üretilmiş index.html tek bir commit olarak yazılır.
// Bu arada depoda başka bir değişiklik olduysa kayıt reddedilir (üzerine yazılmaz).
var crypto = require('node:crypto');
var sayfa = require('../lib/sayfa.js');

var DOSYALAR = {
  site: 'data/site.json',
  yayinlar: 'data/yayinlar.json',
  guncel: 'data/guncel.json',
  aday: 'data/aday.json'
};
var CAKISMA = 'Site içeriği bu arada başka bir yerde değişmiş (örneğin aylık otomatik güncelleme). Paneli yeniden yükleyip değişikliklerinizi tekrar yapın.';

function ayarlar() {
  return {
    token: process.env.GITHUB_TOKEN || '',
    depo: process.env.GITHUB_REPO || 'borabasaran/bbasaran-net',
    dal: process.env.GITHUB_BRANCH || 'main'
  };
}

function yanit(res, kod, veri) {
  res.statusCode = kod;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(veri));
}
function hata(res, kod, mesaj) { yanit(res, kod, { ok: false, hata: mesaj }); }

function govde(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

function kaynakUygun(req) {
  var origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (e) { return false; }
}

function sifreDogru(verilen) {
  var dogru = process.env.PANEL_SIFRESI || '';
  if (!dogru || typeof verilen !== 'string') return false;
  var a = crypto.createHash('sha256').update(verilen).digest();
  var b = crypto.createHash('sha256').update(dogru).digest();
  return crypto.timingSafeEqual(a, b);
}

function bekle(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function github(ayar, yol, secenek) {
  secenek = secenek || {};
  var r = await fetch('https://api.github.com/repos/' + ayar.depo + yol, {
    method: secenek.method || 'GET',
    headers: {
      'Authorization': 'Bearer ' + ayar.token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'bbasaran-net-panel',
      'Content-Type': 'application/json'
    },
    body: secenek.body ? JSON.stringify(secenek.body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  var veri = await r.json().catch(function () { return {}; });
  if (!r.ok) {
    var e = new Error('GitHub: ' + ((veri && veri.message) || ('HTTP ' + r.status)));
    e.status = r.status;
    throw e;
  }
  return veri;
}

async function dalUcu(ayar) {
  var ref = await github(ayar, '/git/ref/heads/' + encodeURIComponent(ayar.dal));
  return ref.object.sha;
}

async function dosyaOku(ayar, yol, ref) {
  var d = await github(ayar, '/contents/' + yol + '?ref=' + encodeURIComponent(ref));
  return Buffer.from(String(d.content || ''), 'base64').toString('utf8');
}

/* ---------- doğrulama ---------- */
var UZUN = 4000;
function metin(v, ad, en) {
  if (v == null) v = '';
  if (typeof v !== 'string') throw new Error(ad + ' metin olmalı.');
  if (v.length > (en || UZUN)) throw new Error(ad + ' çok uzun.');
  return v;
}
function liste(v, ad, en) {
  if (!Array.isArray(v)) throw new Error(ad + ' liste olmalı.');
  if (v.length > (en || 200)) throw new Error(ad + ' çok fazla öğe içeriyor.');
  return v;
}
function nesne(v, ad) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(ad + ' eksik.');
  return v;
}
function baglantiUygun(u) {
  return u === '' || /^https?:\/\/[^\s"'<>]+$/i.test(u) || /^\/[^\s"'<>]*$/.test(u);
}

function yayinDogrula(k, ad) {
  nesne(k, ad);
  var yil = Number(k.yil);
  if (!Number.isInteger(yil) || yil < 1950 || yil > 2100) throw new Error(ad + ': yıl geçersiz.');
  if (!String(k.baslik || '').trim()) throw new Error(ad + ': başlık boş olamaz.');
  return {
    yil: yil,
    baslik: metin(k.baslik, ad + ' başlığı', 600),
    yazarlar: metin(k.yazarlar, ad + ' yazarları', 600),
    kaynak: metin(k.kaynak, ad + ' kaynağı', 400),
    ayrinti: metin(k.ayrinti, ad + ' ayrıntısı', 400),
    dizin: metin(k.dizin, ad + ' dizini', 40)
  };
}

// Gelen veriyi denetler ve beklenen biçime indirger (bilinmeyen alanlar atılır).
function dogrula(v) {
  nesne(v, 'Veri');
  var s = nesne(v.site, 'Site metinleri');
  var k = nesne(s.kapak, 'Kapak');
  var h = nesne(s.hakkinda, 'Hakkımda');
  var a = nesne(s.arastirma, 'Araştırma');
  var c = nesne(s.calismalar, 'Çalışmalar');
  var y = nesne(s.yontem, 'Yöntem');
  var i = nesne(s.iletisim, 'İletişim');
  var site = {
    kapak: {
      unvan: metin(k.unvan, 'Unvan', 200),
      tanitim: metin(k.tanitim, 'Tanıtım', 1200),
      bilgiler: liste(k.bilgiler, 'Kapak bilgileri', 8).map(function (b, n) {
        nesne(b, 'Kapak bilgisi');
        return {
          baslik: metin(b.baslik, 'Kapak bilgisi ' + (n + 1) + ' başlığı', 80),
          satirlar: liste(b.satirlar, 'Kapak bilgisi satırları', 10).map(function (x) { return metin(x, 'Kapak satırı', 200); })
        };
      })
    },
    hakkinda: {
      baslik: metin(h.baslik, 'Hakkımda başlığı', 300),
      paragraflar: liste(h.paragraflar, 'Hakkımda paragrafları', 12).map(function (x) { return metin(x, 'Paragraf'); })
    },
    arastirma: {
      baslik: metin(a.baslik, 'Araştırma başlığı', 300),
      alanlar: liste(a.alanlar, 'Araştırma alanları', 16).map(function (x) {
        nesne(x, 'Araştırma alanı');
        return { baslik: metin(x.baslik, 'Alan başlığı', 200), metin: metin(x.metin, 'Alan metni', 1500) };
      })
    },
    calismalar: {
      baslik: metin(c.baslik, 'Çalışmalar başlığı', 300),
      kartlar: liste(c.kartlar, 'Kartlar', 30).map(function (x, n) {
        nesne(x, 'Kart');
        var bag = metin(x.baglanti, 'Kart bağlantısı', 500).trim();
        if (!baglantiUygun(bag)) throw new Error('Kart ' + (n + 1) + ': bağlantı https:// ile başlamalı.');
        return {
          baslik: metin(x.baslik, 'Kart başlığı', 200),
          metin: metin(x.metin, 'Kart metni', 1500),
          etiket: metin(x.etiket, 'Kart etiketi', 60),
          renk: x.renk === 'sari' ? 'sari' : 'yesil',
          baglanti: bag,
          baglantiMetni: metin(x.baglantiMetni, 'Bağlantı metni', 60)
        };
      })
    },
    yontem: {
      baslik: metin(y.baslik, 'Yöntem başlığı', 300),
      sekmeler: liste(y.sekmeler, 'Yöntem sekmeleri', 4).map(function (x) {
        nesne(x, 'Yöntem sekmesi');
        return {
          ad: metin(x.ad, 'Sekme adı', 60),
          maddeler: liste(x.maddeler, 'Yöntem maddeleri', 20).map(function (m) {
            nesne(m, 'Yöntem maddesi');
            return { baslik: metin(m.baslik, 'Madde başlığı', 200), metin: metin(m.metin, 'Madde metni', 1500) };
          })
        };
      })
    },
    yayinlar: { not: metin(nesne(s.yayinlar, 'Yayın notu').not, 'Yayın notu', 1000) },
    iletisim: {
      baslik: metin(i.baslik, 'İletişim başlığı', 300),
      aciklama: metin(i.aciklama, 'İletişim açıklaması', 1500),
      konular: liste(i.konular, 'Konular', 20).map(function (x) { return metin(x, 'Konu', 120); }),
      bilgiler: liste(i.bilgiler, 'İletişim bilgileri', 12).map(function (x) {
        nesne(x, 'İletişim bilgisi');
        return { baslik: metin(x.baslik, 'Bilgi başlığı', 80), deger: metin(x.deger, 'Bilgi değeri', 300) };
      })
    }
  };

  var yv = nesne(v.yayinlar, 'Yayınlar');
  var yayinlar = {
    guncellendi: metin(yv.guncellendi, 'Tarih', 20),
    makaleler: liste(yv.makaleler, 'Makaleler', 400).map(function (x, n) { return yayinDogrula(x, 'Makale ' + (n + 1)); }),
    bolumler: liste(yv.bolumler, 'Kitap bölümleri', 400).map(function (x, n) { return yayinDogrula(x, 'Kitap bölümü ' + (n + 1)); })
  };

  var gv = nesne(v.guncel, 'Güncel çağrı');
  var guncel = { kitap: metin(gv.kitap, 'Güncel çağrı', 200), guncellendi: metin(gv.guncellendi, 'Tarih', 20) };

  var av = nesne(v.aday, 'Yayın adayları');
  var aday = {
    aciklama: metin(av.aciklama, 'Aday açıklaması', 1000),
    guncellendi: metin(av.guncellendi, 'Tarih', 20),
    adaylar: liste(av.adaylar || [], 'Adaylar', 300).map(function (x) {
      nesne(x, 'Aday');
      return { yil: Number(x.yil) || 0, baslik: metin(x.baslik, 'Aday başlığı', 600), kaynak: metin(x.kaynak, 'Aday kaynağı', 400), doi: metin(x.doi, 'DOI', 300) };
    }),
    yoksayilanlar: liste(av.yoksayilanlar || [], 'Yok sayılanlar', 1000).map(function (x) { return metin(x, 'Yok sayılan', 600); })
  };
  if (!aday.aciklama) delete aday.aciklama;
  if (!aday.yoksayilanlar.length) delete aday.yoksayilanlar;

  return { site: site, yayinlar: yayinlar, guncel: guncel, aday: aday };
}

function jsonMetni(x) { return JSON.stringify(x, null, 2) + '\n'; }

/* ---------- işlemler ---------- */
async function oku(res, ayar) {
  var uc = await dalUcu(ayar);
  var anahtarlar = Object.keys(DOSYALAR);
  var icerikler = await Promise.all(anahtarlar.map(function (a) { return dosyaOku(ayar, DOSYALAR[a], uc); }));
  var veri = {};
  anahtarlar.forEach(function (a, n) { veri[a] = JSON.parse(icerikler[n]); });
  return yanit(res, 200, { ok: true, surum: uc, veri: veri });
}

async function kaydet(res, ayar, b) {
  var veri;
  try { veri = dogrula(b.veri); } catch (e) { return hata(res, 400, e.message); }
  var surum = String(b.surum || '');
  var uc = await dalUcu(ayar);
  if (!surum || surum !== uc) return hata(res, 409, CAKISMA);

  var html = await dosyaOku(ayar, 'index.html', uc);
  var yeniHtml;
  try { yeniHtml = sayfa.sayfayiUret(html, veri); } catch (e) { return hata(res, 500, 'Sayfa üretilemedi: ' + e.message); }

  var commit = await github(ayar, '/git/commits/' + uc);
  var dosyalar = [{ path: 'index.html', mode: '100644', type: 'blob', content: yeniHtml }];
  Object.keys(DOSYALAR).forEach(function (a) {
    dosyalar.push({ path: DOSYALAR[a], mode: '100644', type: 'blob', content: jsonMetni(veri[a]) });
  });
  var agac = await github(ayar, '/git/trees', { method: 'POST', body: { base_tree: commit.tree.sha, tree: dosyalar } });
  if (agac.sha === commit.tree.sha) return yanit(res, 200, { ok: true, surum: uc, degisiklik: false });

  var yeni = await github(ayar, '/git/commits', {
    method: 'POST',
    body: { message: 'Panelden içerik güncellemesi', tree: agac.sha, parents: [uc] }
  });
  try {
    await github(ayar, '/git/refs/heads/' + encodeURIComponent(ayar.dal), { method: 'PATCH', body: { sha: yeni.sha, force: false } });
  } catch (e) {
    if (e.status === 422 || e.status === 409) return hata(res, 409, CAKISMA);
    throw e;
  }
  return yanit(res, 200, { ok: true, surum: yeni.sha, degisiklik: true });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return hata(res, 405, 'Yalnızca POST desteklenir.');
  if (!kaynakUygun(req)) return hata(res, 403, 'Bu kaynaktan erişime izin verilmiyor.');
  if (!process.env.PANEL_SIFRESI) return hata(res, 500, 'Sunucuda PANEL_SIFRESI tanımlı değil.');
  var b = govde(req);
  if (!sifreDogru(b.sifre)) {
    await bekle(700);
    return hata(res, 401, 'Hatalı şifre.');
  }
  var ayar = ayarlar();
  try {
    if (b.eylem === 'giris') return yanit(res, 200, { ok: true });
    if (!ayar.token) return hata(res, 500, 'Sunucuda GITHUB_TOKEN tanımlı değil.');
    if (b.eylem === 'oku') return await oku(res, ayar);
    if (b.eylem === 'kaydet') return await kaydet(res, ayar, b);
    return hata(res, 400, 'Bilinmeyen işlem.');
  } catch (e) {
    var kod = e.status === 401 || e.status === 403 ? 502 : (e.status === 404 ? 502 : 500);
    var m = e.message || 'Sunucu hatası.';
    if (e.status === 401 || e.status === 403) m = 'GitHub erişimi reddedildi. GITHUB_TOKEN anahtarının bu depoya yazma izni olduğunu kontrol edin.';
    return hata(res, kod, m);
  }
};

module.exports.dogrula = dogrula;
