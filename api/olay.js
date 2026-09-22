// bbasaran.net istatistik toplayıcı.
// Tarayıcıdan gelen olayları Supabase'deki bb_olaylar tablosuna yazar.
// Kişisel veri saklanmaz: IP, çerez, e-posta ya da kalıcı ziyaretçi kimliği yoktur.
// 'oturum' sekme kapanınca silinen rastgele bir sayıdır; ülke bilgisi Vercel'in
// istek başlığından gelir ve yalnızca iki harfli ülke kodudur.

var TURLER = ['ziyaret', 'bolum', 'tiklama', 'olcer'];
var CIHAZLAR = ['masaustu', 'telefon', 'tablet'];

function govde(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

function kaynakUygun(req) {
  var origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (e) { return false; }
}

function kisalt(v, n) {
  if (typeof v !== 'string') return null;
  var s = v.trim().slice(0, n);
  return s || null;
}

// Yalnızca alan adı bırakır: "https://www.google.com/arama?q=x" -> "google.com"
function alanAdi(v) {
  var s = kisalt(v, 200);
  if (!s) return null;
  try {
    var h = new URL(s).hostname.replace(/^www\./, '');
    return /^[a-z0-9.-]{1,80}$/i.test(h) ? h : null;
  } catch (e) { return null; }
}

function bitir(res, kod) {
  res.statusCode = kod;
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return bitir(res, 405);
  if (!kaynakUygun(req)) return bitir(res, 403);

  var url = process.env.SUPABASE_URL || '';
  var anahtar = process.env.SUPABASE_ANAHTAR || '';
  // Ayarlar yoksa sessizce geçilir; site çalışmaya devam eder.
  if (!url || !anahtar) return bitir(res, 204);

  var b = govde(req);
  if (TURLER.indexOf(b.tur) < 0) return bitir(res, 204);

  var satir = {
    tur: b.tur,
    deger: kisalt(b.deger, 60),
    kaynak: alanAdi(b.kaynak),
    cihaz: CIHAZLAR.indexOf(b.cihaz) >= 0 ? b.cihaz : null,
    ulke: kisalt(req.headers['x-vercel-ip-country'], 2),
    oturum: kisalt(String(b.oturum || '').replace(/[^a-z0-9]/gi, ''), 24)
  };

  try {
    await fetch(url.replace(/\/+$/, '') + '/rest/v1/bb_olaylar', {
      method: 'POST',
      headers: {
        'apikey': anahtar,
        'Authorization': 'Bearer ' + anahtar,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(satir),
      signal: AbortSignal.timeout(4000)
    });
  } catch (e) { /* istatistik yazılamazsa site etkilenmez */ }

  return bitir(res, 204);
};
