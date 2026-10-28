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
      araclar: liste(k.araclar || [], 'Kapak araçları', 60).map(function (x, n) {
        nesne(x, 'Kapak aracı');
        var bag = metin(x.baglanti, 'Araç bağlantısı', 500).trim();
        if (!baglantiUygun(bag)) throw new Error('Araç ' + (n + 1) + ': bağlantı https:// ile başlamalı.');
        return {
          etiket: metin(x.etiket, 'Araç etiketi', 60),
          baslik: metin(x.baslik, 'Araç başlığı', 120),
          baglanti: bag,
          dugme: metin(x.dugme, 'Araç düğmesi', 40)
        };
      }),
      bilgiler: liste(k.bilgiler, 'Kapak bilgileri', 8).map(function (b, n) {
        nesne(b, 'Kapak bilgisi');
        var bilgi = {
          baslik: metin(b.baslik, 'Kapak bilgisi ' + (n + 1) + ' başlığı', 80),
          satirlar: liste(b.satirlar, 'Kapak bilgisi satırları', 10).map(function (x) { return metin(x, 'Kapak satırı', 400); })
        };
        if (b.gorunum === 'liste') bilgi.gorunum = 'liste';
        return bilgi;
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

/* ---------- istatistik ---------- */
// Supabase'deki bb_ozet fonksiyonu toplamları verir. Buna ek olarak son tıklamalar
// zamanlarıyla okunur; her tıklamanın "nereden gelindi" bilgisi, aynı oturumun
// siteye ilk girişindeki kaynaktan alınır. Aynı kişinin aynı öğeye art arda
// tıklamaları tek hareket sayılır.
var TEKRAR_SANIYE = 120;
var HAREKET_SINIRI = 500;

function supabaseIstek(url, anahtar, yol, secenek) {
  secenek = secenek || {};
  return fetch(url.replace(/\/+$/, '') + yol, {
    method: secenek.method || 'GET',
    headers: {
      'apikey': anahtar,
      'Authorization': 'Bearer ' + anahtar,
      'Content-Type': 'application/json'
    },
    body: secenek.body ? JSON.stringify(secenek.body) : undefined,
    signal: AbortSignal.timeout(12000)
  });
}

// Türkiye takvimine göre, bugünden geriye 'gun' günlük aralığın ilk günü (YYYY-MM-DD).
function baslangicGunu(gun, simdi) {
  var bugun = (simdi || new Date()).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  var d = new Date(bugun + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - (gun - 1));
  return d.toISOString().slice(0, 10);
}

// Tıklamaları (yeniden eskiye sıralı) hareketlere dönüştürür.
function hareketleriKur(tiklamalar, ziyaretler) {
  var kaynaklar = {};
  (ziyaretler || []).forEach(function (z) {
    if (!z.oturum) return;
    if (!(z.oturum in kaynaklar)) kaynaklar[z.oturum] = null;
    if (!kaynaklar[z.oturum] && z.kaynak) kaynaklar[z.oturum] = z.kaynak;
  });

  var hareketler = [];
  var kisiler = {};
  var eskidenYeniye = (tiklamalar || []).slice().reverse();
  eskidenYeniye.forEach(function (t) {
    var ad = t.deger || 'Adsız';
    if (t.oturum) {
      kisiler[ad] = kisiler[ad] || {};
      kisiler[ad][t.oturum] = 1;
    }
    var son = hareketler[hareketler.length - 1];
    var zaman = Date.parse(t.olusturuldu);
    if (son && t.oturum && son.oturum === t.oturum && son.ad === ad &&
        (zaman - Date.parse(son.son_zaman)) / 1000 <= TEKRAR_SANIYE) {
      son.adet += 1;
      son.son_zaman = t.olusturuldu;
      return;
    }
    var kaynak;
    if (!t.oturum || !(t.oturum in kaynaklar)) kaynak = 'bilinmiyor';
    else kaynak = kaynaklar[t.oturum] || 'doğrudan';
    hareketler.push({
      zaman: t.olusturuldu, son_zaman: t.olusturuldu, ad: ad, adet: 1,
      cihaz: t.cihaz || null, ulke: t.ulke || null, kaynak: kaynak, oturum: t.oturum || null
    });
  });

  var kisiSayisi = {};
  Object.keys(kisiler).forEach(function (ad) { kisiSayisi[ad] = Object.keys(kisiler[ad]).length; });
  return {
    hareketler: hareketler.reverse().map(function (h) {
      return { zaman: h.zaman, ad: h.ad, adet: h.adet, cihaz: h.cihaz, ulke: h.ulke, kaynak: h.kaynak };
    }),
    kisiSayisi: kisiSayisi
  };
}

// Ziyaret kimliğine (oturum) göre olayları birleştirir: her ziyaretin giriş kaynağı,
// cihazı, ülkesi, süresi ve sitede sırayla yaptıkları. Olaylar eskiden yeniye sıralı gelir.
function oturumlariKur(olaylar) {
  var harita = {};
  var sira = [];
  (olaylar || []).forEach(function (o, i) {
    var k = o.oturum || ('_' + i);
    var s = harita[k];
    if (!s) {
      s = harita[k] = { bas: o.olusturuldu, son: o.olusturuldu, kaynak: null, giris: false, cihaz: null, ulke: null, sayfa: 0, adimlar: [] };
      sira.push(s);
    }
    s.son = o.olusturuldu;
    if (!s.cihaz && o.cihaz) s.cihaz = o.cihaz;
    if (!s.ulke && o.ulke) s.ulke = o.ulke;
    if (o.tur === 'ziyaret') {
      s.giris = true;
      s.sayfa += 1;
      if (!s.kaynak && o.kaynak) s.kaynak = o.kaynak;
      return;
    }
    var onceki = s.adimlar[s.adimlar.length - 1];
    if (onceki && onceki.tur === o.tur && onceki.ad === (o.deger || '') &&
        (Date.parse(o.olusturuldu) - Date.parse(onceki.son)) / 1000 <= TEKRAR_SANIYE) {
      onceki.adet += 1;
      onceki.son = o.olusturuldu;
      return;
    }
    s.adimlar.push({ zaman: o.olusturuldu, son: o.olusturuldu, tur: o.tur, ad: o.deger || '', adet: 1 });
  });
  return sira.map(function (s) {
    return {
      bas: s.bas,
      sure: Math.max(0, Math.round((Date.parse(s.son) - Date.parse(s.bas)) / 1000)),
      kaynak: s.giris ? (s.kaynak || 'doğrudan') : 'bilinmiyor',
      cihaz: s.cihaz, ulke: s.ulke, sayfa: s.sayfa,
      adimlar: s.adimlar.map(function (a) { return { zaman: a.zaman, tur: a.tur, ad: a.ad, adet: a.adet }; })
    };
  });
}

// Olaylardan sekmelerin ihtiyaç duyduğu özetleri çıkarır.
function istatistikDerle(olaylar) {
  olaylar = olaylar || [];
  var ziyaretler = oturumlariKur(olaylar);

  function ozetle(tur) {
    var h = {};
    olaylar.forEach(function (o) {
      if (o.tur !== tur) return;
      var ad = o.deger || 'Adsız';
      var x = h[ad] = h[ad] || { ad: ad, n: 0, kisiler: {}, son: o.olusturuldu };
      x.n += 1;
      if (o.oturum) x.kisiler[o.oturum] = 1;
      if (o.olusturuldu > x.son) x.son = o.olusturuldu;
    });
    return Object.keys(h).map(function (k) {
      var x = h[k];
      return { ad: x.ad, n: x.n, kisi: Object.keys(x.kisiler).length, son: x.son };
    }).sort(function (a, b) { return b.kisi - a.kisi || b.n - a.n; });
  }

  var kaynakMap = {};
  ziyaretler.forEach(function (z) {
    if (z.kaynak === 'bilinmiyor') return;
    var x = kaynakMap[z.kaynak] = kaynakMap[z.kaynak] || { ad: z.kaynak, ziyaret: 0, bolum: 0, tiklayan: 0, son: z.bas };
    x.ziyaret += 1;
    var bolumler = {};
    z.adimlar.forEach(function (a) { if (a.tur === 'bolum') bolumler[a.ad] = 1; });
    x.bolum += Object.keys(bolumler).length;
    if (z.adimlar.some(function (a) { return a.tur === 'tiklama'; })) x.tiklayan += 1;
    if (z.bas > x.son) x.son = z.bas;
  });
  var kaynaklar = Object.keys(kaynakMap).map(function (k) {
    var x = kaynakMap[k];
    return { ad: x.ad, ziyaret: x.ziyaret, ortBolum: Math.round((x.bolum / x.ziyaret) * 10) / 10, tiklayan: x.tiklayan, son: x.son };
  }).sort(function (a, b) { return b.ziyaret - a.ziyaret; });

  // Her bölüm açılışına, o kişinin siteye giriş kaynağı eklenir.
  var giris = {};
  olaylar.forEach(function (o) {
    if (o.tur !== 'ziyaret' || !o.oturum) return;
    if (!(o.oturum in giris)) giris[o.oturum] = null;
    if (!giris[o.oturum] && o.kaynak) giris[o.oturum] = o.kaynak;
  });
  var bolumListesi = olaylar.filter(function (o) { return o.tur === 'bolum'; }).map(function (o) {
    var kaynak = o.oturum && (o.oturum in giris) ? (giris[o.oturum] || 'doğrudan') : 'bilinmiyor';
    return { zaman: o.olusturuldu, ad: o.deger || '', cihaz: o.cihaz || null, ulke: o.ulke || null, kaynak: kaynak };
  });

  var tiklamalar = olaylar.filter(function (o) { return o.tur === 'tiklama'; }).reverse();
  var girisler = olaylar.filter(function (o) { return o.tur === 'ziyaret'; });

  return {
    ziyaretler: ziyaretler.reverse().slice(0, ZIYARET_SINIRI),
    bolumOzeti: ozetle('bolum'),
    bolumListesi: bolumListesi.reverse().slice(0, LISTE_SINIRI),
    tiklamaOzeti: ozetle('tiklama'),
    hareketler: hareketleriKur(tiklamalar, girisler).hareketler.slice(0, LISTE_SINIRI),
    kaynakOzeti: kaynaklar
  };
}

var OLAY_SINIRI = 20000;
var ZIYARET_SINIRI = 1500;
var LISTE_SINIRI = 1500;

async function olaylariOku(url, anahtar, bas) {
  var tum = [];
  var parca = 1000;
  for (var atla = 0; atla < OLAY_SINIRI; atla += parca) {
    var r = await supabaseIstek(url, anahtar, '/rest/v1/bb_olaylar?select=olusturuldu,tur,deger,kaynak,cihaz,ulke,oturum' +
      '&gun=gte.' + bas + '&order=olusturuldu.asc,id.asc&limit=' + parca + '&offset=' + atla);
    if (!r.ok) throw new Error('Olaylar okunamadı (HTTP ' + r.status + ')');
    var p = await r.json();
    if (!Array.isArray(p)) break;
    tum = tum.concat(p);
    if (p.length < parca) return { olaylar: tum, kesik: false };
  }
  return { olaylar: tum, kesik: true };
}

async function istatistik(res, b) {
  var url = process.env.SUPABASE_URL || '';
  var anahtar = process.env.SUPABASE_ANAHTAR || '';
  if (!url || !anahtar) return hata(res, 500, 'Sunucuda SUPABASE_URL ve SUPABASE_ANAHTAR tanımlı değil.');
  var gun = Math.min(Math.max(parseInt(b.gun, 10) || 30, 1), 365);
  var bas = baslangicGunu(gun);

  var sonuc = await Promise.all([
    supabaseIstek(url, anahtar, '/rest/v1/rpc/bb_ozet', { method: 'POST', body: { p_gun: gun } }),
    olaylariOku(url, anahtar, bas).catch(function (e) { return { hata: e.message }; })
  ]);
  var veri = await sonuc[0].json().catch(function () { return null; });
  if (!sonuc[0].ok || !veri) return hata(res, 502, 'İstatistik okunamadı: ' + ((veri && veri.message) || ('HTTP ' + sonuc[0].status)));

  if (sonuc[1].hata) {
    veri.ayrinti_hatasi = sonuc[1].hata;
  } else {
    var d = istatistikDerle(sonuc[1].olaylar);
    Object.keys(d).forEach(function (k) { veri[k] = d[k]; });
    veri.kesik = sonuc[1].kesik;
  }
  return yanit(res, 200, { ok: true, ozet: veri });
}

/* ---------- Google arama verileri (Search Console) ---------- */
// GSC_ANAHTAR: Google Cloud hizmet hesabının JSON anahtarı (Vercel ortam değişkeni).
// Hizmet hesabı Search Console'da bbasaran.net alan adı mülküne "Kısıtlanmış" kullanıcı
// olarak eklenmiş olmalı. Yalnızca okuma izni istenir.
var GSC_MULK = process.env.GSC_MULK || 'sc-domain:bbasaran.net';
var GSC_KAPSAM = 'https://www.googleapis.com/auth/webmasters.readonly';
var gscBelirteci = { deger: '', bitis: 0 };

function b64url(x) {
  return Buffer.from(x).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function gscAnahtari() {
  var ham = process.env.GSC_ANAHTAR || '';
  if (!ham) return null;
  try {
    var a = JSON.parse(ham);
    if (!a.client_email || !a.private_key) return null;
    return a;
  } catch (e) { return null; }
}

async function gscErisim(anahtar, simdi) {
  simdi = simdi || Date.now();
  if (gscBelirteci.deger && gscBelirteci.bitis > simdi + 60000) return gscBelirteci.deger;
  var iat = Math.floor(simdi / 1000);
  var govdeMetni = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64url(JSON.stringify({
    iss: anahtar.client_email, scope: GSC_KAPSAM,
    aud: 'https://oauth2.googleapis.com/token', iat: iat, exp: iat + 3600
  }));
  var imza = crypto.createSign('RSA-SHA256').update(govdeMetni).sign(anahtar.private_key);
  var jwt = govdeMetni + '.' + b64url(imza);
  var r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwt,
    signal: AbortSignal.timeout(10000)
  });
  var d = await r.json().catch(function () { return {}; });
  if (!r.ok || !d.access_token) {
    var e = new Error('Google erişim anahtarı alınamadı: ' + (d.error_description || d.error || ('HTTP ' + r.status)));
    e.gsc = 'anahtar';
    throw e;
  }
  gscBelirteci = { deger: d.access_token, bitis: simdi + (Number(d.expires_in) || 3600) * 1000 };
  return d.access_token;
}

async function gscSorgu(belirtec, govde) {
  var r = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(GSC_MULK) + '/searchAnalytics/query', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + belirtec, 'Content-Type': 'application/json' },
    body: JSON.stringify(govde),
    signal: AbortSignal.timeout(12000)
  });
  var d = await r.json().catch(function () { return {}; });
  if (!r.ok) {
    var e = new Error((d.error && d.error.message) || ('HTTP ' + r.status));
    e.gsc = r.status === 403 ? 'izin' : 'sorgu';
    throw e;
  }
  return d.rows || [];
}

function gscSatir(x) {
  return {
    ad: (x.keys && x.keys[0]) || '',
    tiklama: x.clicks || 0,
    gosterim: x.impressions || 0,
    sira: Math.round((x.position || 0) * 10) / 10
  };
}

async function arama(res, b, simdi) {
  var anahtar = gscAnahtari();
  if (!anahtar) return yanit(res, 200, { ok: true, durum: 'kurulmadi' });
  var gun = Math.min(Math.max(parseInt(b.gun, 10) || 30, 1), 365);
  // Google verileri 2-3 gün gecikmeli gelir; aralık bu gecikmeyi de kapsasın diye en az 7 gün.
  var bas = baslangicGunu(Math.max(gun, 7), simdi);
  var bit = baslangicGunu(1, simdi);
  try {
    var belirtec = await gscErisim(anahtar, simdi && simdi.getTime());
    var sonuc = await Promise.all([
      gscSorgu(belirtec, { startDate: bas, endDate: bit, dimensions: ['query'], rowLimit: 50 }),
      gscSorgu(belirtec, { startDate: bas, endDate: bit, dimensions: ['page'], rowLimit: 25 }),
      gscSorgu(belirtec, { startDate: bas, endDate: bit })
    ]);
    var toplam = sonuc[2][0] || {};
    return yanit(res, 200, {
      ok: true, durum: 'hazir', bas: bas, bit: bit,
      toplam: { tiklama: toplam.clicks || 0, gosterim: toplam.impressions || 0 },
      aramalar: sonuc[0].map(gscSatir),
      sayfalar: sonuc[1].map(gscSatir)
    });
  } catch (e) {
    return yanit(res, 200, { ok: true, durum: e.gsc || 'sorgu', hata: e.message });
  }
}

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
    if (b.eylem === 'istatistik') return await istatistik(res, b);
    if (b.eylem === 'arama') return await arama(res, b);
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
module.exports.hareketleriKur = hareketleriKur;
module.exports.baslangicGunu = baslangicGunu;
module.exports.arama = arama;
module.exports._gscSifirla = function () { gscBelirteci = { deger: '', bitis: 0 }; };
module.exports.istatistikDerle = istatistikDerle;
