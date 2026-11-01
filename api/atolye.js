// Atölye sayfası için ilgi özeti.
// Son yedi günde her araca bu siteden (kapak kutuları ve Atölye) kaç kez
// tıklandığını gün gün döndürür. Yalnızca toplamlar çıkar; tek tek satırlar,
// oturum, cihaz, ülke ya da kaynak bilgisi bu yanıtta yer almaz.

var GUN = 7;
var TR_FARK = 3 * 3600 * 1000; // Türkiye saati (UTC+3)
var ON_EK = 'Atölye: ';

function gunAnahtari(ms) {
  return new Date(ms + TR_FARK).toISOString().slice(0, 10);
}

// Son 'gun' günün tarihleri, en eskiden bugüne
function gunler(simdi, gun) {
  var sonuc = [];
  for (var i = gun - 1; i >= 0; i--) sonuc.push(gunAnahtari(simdi - i * 86400000));
  return sonuc;
}

// Tıklama satırlarını araç adına göre gün gün sayar.
// "Atölye: Tez Atlası" ile kapaktaki "Tez Atlası" aynı araç sayılır.
function say(satirlar, simdi, gun) {
  gun = gun || GUN;
  var liste = gunler(simdi, gun);
  var sira = {};
  liste.forEach(function (g, i) { sira[g] = i; });
  var araclar = {};
  (satirlar || []).forEach(function (s) {
    var ad = String(s.deger || '');
    if (ad.indexOf(ON_EK) === 0) ad = ad.slice(ON_EK.length);
    ad = ad.trim();
    if (!ad || ad.indexOf('Atölye') === 0 || ad.indexOf('Dış bağlantı') === 0 || ad.indexOf('Çalışma:') === 0) return;
    var i = sira[gunAnahtari(Date.parse(s.olusturuldu))];
    if (i == null) return;
    if (!araclar[ad]) araclar[ad] = liste.map(function () { return 0; });
    araclar[ad][i]++;
  });
  return { gunler: liste, araclar: araclar };
}

function yaz(res, kod, govde) {
  res.statusCode = kod;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', kod === 200 ? 'public, s-maxage=900, stale-while-revalidate=3600' : 'no-store');
  res.end(JSON.stringify(govde));
}

async function handler(req, res) {
  if (req.method !== 'GET') return yaz(res, 405, {});
  var url = process.env.SUPABASE_URL || '';
  var anahtar = process.env.SUPABASE_ANAHTAR || '';
  var simdi = Date.now();
  // Ayar yoksa boş özet döner; sayfa çubukları göstermez.
  if (!url || !anahtar) return yaz(res, 200, { gunler: gunler(simdi, GUN), araclar: {} });
  var bas = new Date(simdi - GUN * 86400000).toISOString();
  try {
    var r = await fetch(url.replace(/\/+$/, '') + '/rest/v1/bb_olaylar?select=olusturuldu,deger&tur=eq.tiklama&olusturuldu=gte.'
      + encodeURIComponent(bas) + '&order=olusturuldu.desc&limit=10000', {
      headers: { 'apikey': anahtar, 'Authorization': 'Bearer ' + anahtar }
    });
    if (!r.ok) return yaz(res, 200, { gunler: gunler(simdi, GUN), araclar: {} });
    var satirlar = await r.json();
    return yaz(res, 200, say(satirlar, simdi, GUN));
  } catch (e) {
    return yaz(res, 200, { gunler: gunler(simdi, GUN), araclar: {} });
  }
}

module.exports = handler;
module.exports.say = say;
