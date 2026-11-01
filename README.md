# bbasaran.net

Doç. Dr. Bora Başaran'ın kişisel akademik sitesi.

## Yapı

Statik site, derleme adımı yok:

- `index.html` — sayfanın tamamı; içerik blokları `<!-- AD:BASLA -->` ile `<!-- AD:BITTI -->` işaretleri arasındadır
- `data/site.json` — kapak, kapaktaki araç kutuları, hakkımda, araştırma, çalışmalar, yöntem, iletişim metinleri
- `data/yayinlar.json` — makaleler ve kitap bölümleri
- `data/guncel.json` — güncel kitap çağrısı bandı
- `data/aday.json` — OpenAlex'te bulunan, henüz listede olmayan yayın adayları (siteye yansımaz)
- `lib/sayfa.js` — işaretli blokları verilerden üreten ortak modül
- `styles.css`, `cover.css`, `sekme.css`, `kitap.css` — biçim
- `app.js` — kapak, kitap kurgusu, okunabilirlik ölçer, form, ziyaret sayacı
- `araclar.js` — kapaktaki bilgi ve araç satırlarını ikişerli kutulara böler, okları yönetir
- `api/olay.js` — ziyaret istatistiklerini yazan sunucu işlevi
- `atolye/` — Atölye sayfası (`bbasaran.net/atolye/`): araçların akış, yakından ve ızgara görünümleri
- `api/atolye.js` — Atölye'deki ilgi çubukları için son yedi günün araç tıklama toplamları
- `scripts/guncelle.mjs` — aylık güncelleyici
- `scripts/uret.mjs` — sayfayı verilerden elle yeniden üretir
- `robots.txt`, `sitemap.xml` — arama motorları için; panel ve API dizine alınmaz

## İçeriği değiştirmek

Metinler `data/` altındaki JSON dosyalarındadır. İşaretli blokların içini elle düzenlemeyin; bir sonraki üretimde verilerden yeniden yazılır.

```
node scripts/uret.mjs   # index.html'i verilerden yeniden üretir
npm test                # index.html ile verilerin uyumunu denetler
```

Kapaktaki araç kutularının (`kapak.araclar`) sayı sınırı yoktur; her kutunun üst etiketi, başlığı, bağlantısı ve düğme yazısı vardır. Bağlantısı boş olan kutu sayfaya yazılmaz. Kapağın en üst satırında Retro Artikel Avcısı sola yaslı durur; altında Okunabilirlik ölçer solda sabit durur, yanında bağlantı kutuları ikişerli görünür ve büyük oklarla değişir (ölçer ve oyun sabittir, veriden gelmez). Bilgi satırında da "Linkler" kutusu solda sabittir, diğer bilgi kutuları ikişerli görünür ve oklarla değişir. Kaç kutu eklenirse eklensin kapağın yüksekliği değişmez. Kutu başlıkları kapakta tek satırdır.

Yöntem maddelerinde `[[terim]]` yazımı vurgulu terim olarak gösterilir. Kapaktaki bilgi satırlarında birden fazla satır varsa kapakta sırayla döner. Çalışma kartına `baglanti` eklenirse kartta bir bağlantı görünür; `renk` alanı `yesil` ya da `sari` olabilir.

## Atölye

Atölye, ana sayfada kapaktan sonraki ilk sayfadır; aynı içerik `bbasaran.net/atolye/` adresinde tek başına da açılır. Araçlar panelde "Atölye araçları" listesinden (`kapak.araclar`) okunur. Kapakta araçlar tek tek sıralanmaz; okunabilirlik ölçerin yanındaki tek Atölye kutusu araç sayısını ve adlarını kendiliğinden gösterir. Kapaktaki sözcük alanında bir sözcüğe tıklamak, sözcüğün geldiği bölümü açar (Atölye aracından gelen sözcük o aracı yakından açar). Her araç kaydında şu alanlar da vardır:

- `kategori`: `ogrenci`, `arastirma` ya da `etkinlik`
- `aciklama`: Atölye'deki künyede görünen bir iki cümle (boşsa başlık kullanılır)
- `cizim`: kartın üstündeki küçük hareketli çizim (`tez`, `arsi`, `daf`, `yontem`, `biblio`, `ilan`, `takvim`, `kitap`, `halka`)
- `durum`: `yapim` ise "yapım aşamasında" olarak gösterilir
- `deney`: `daf` (düzeye göre örnek diyalog) ya da `arsi2209` (örnek sokratik akış); boşsa tanıtım gösterilir

Bir araca doğrudan bağlantı `bbasaran.net/atolye/#tez-atlasi` biçimindedir. İlgi çubukları, kapaktan ve Atölye'den o araca yapılan tıklamaların son yedi günlük toplamıdır; hiç tıklama yoksa çubuk gösterilmez.

## İçerik paneli

`bbasaran.net/panel` adresindeki panelden tüm metinler tarayıcıdan düzenlenebilir. Panel kaydettiğinde `data/` altındaki dosyaları ve `index.html`'i tek bir commit olarak `main` dalına yazar; Vercel siteyi bir iki dakika içinde günceller. Yayın adayları Yayınlar sekmesinde görünür: "ekle" ile listeye alınır, "Yok say" ile bir daha önerilmez. Her yayına `doi` ya da `baglanti` girilebilir; girilen yayının başlığı tıklanabilir olur, DOI varsa doi.org adresine gider. Adaydan eklenen yayının DOI'si kendiliğinden gelir. **İstatistik** sekmesi ziyaret sayılarını gösterir.

- `panel/index.html` — panel arayüzü
- `api/panel.js` — şifreyi denetleyen, GitHub'a yazan ve istatistik özetini okuyan sunucu işlevi

Vercel ortam değişkenleri (Settings → Environment Variables):

- `PANEL_SIFRESI` — panelin giriş şifresi
- `GITHUB_TOKEN` — yalnızca bu depoya, yalnızca Contents okuma/yazma izni olan ince ayarlı (fine-grained) token
- `GITHUB_REPO` (isteğe bağlı, varsayılan `borabasaran/bbasaran-net`), `GITHUB_BRANCH` (isteğe bağlı, varsayılan `main`)
- `SUPABASE_URL` ve `SUPABASE_ANAHTAR` — istatistik için (aşağıya bakın)

Aynı anda iki yerden düzenleme yapılırsa ikinci kayıt reddedilir ve panel yeniden yüklemeyi önerir; böylece kimse ötekinin değişikliğini ezmez.

## Yayın

Vercel `main` dalını izler. Her commit siteyi otomatik günceller.

## Aylık güncelleme

`.github/workflows/guncelle.yml` her ayın 1'inde çalışır. Actions sekmesinden elle de tetiklenebilir.

Görev iki iş yapar:

1. **Tam otomatik:** `kitap.bbasaran.net` sayfasından güncel kitap başlığını alır, menünün altındaki şeride yazar.
2. **Onaya bırakır:** OpenAlex'te bulunup `data/yayinlar.json` içinde görünmeyen kayıtları `data/aday.json` dosyasına yazar. **Siteye yansımaz.** `yoksayilanlar` listesindeki başlıklar aday olarak yeniden önerilmez.

OpenAlex aynı çalışmanın çeviri başlıklı kaydını ayrı bir yayın gibi döndürebildiği için otomatik ekleme kapatılmıştır. Gerçekten yeni olanları doğru künyesiyle `data/yayinlar.json` içine taşıyın.

## Ziyaret istatistikleri

Sayfa, Supabase'deki `bb_olaylar` tablosuna dört tür olay yazar: `ziyaret`, `bolum` (açılan bölüm), `tiklama` (kapak araçları, kitap bandı, çalışma kartları, dış bağlantılar) ve `olcer` (okunabilirlik ölçerin kullanılması). Panelin **İstatistik** sekmesi bu sayıları gösterir.

- Çerez, IP adresi ve kalıcı ziyaretçi kimliği tutulmaz. `oturum` alanı sekme kapanınca silinen rastgele bir sayıdır.
- Tarayıcısında izlenmeme tercihi (Do Not Track) açık olan ziyaretçiden hiçbir olay gönderilmez.
- Ülke bilgisi yalnızca Vercel'in istek başlığındaki iki harfli koddur.
- Tabloda RLS açık ve politika yoktur: yazma ve okuma yalnızca sunucudaki gizli anahtarla olur.
- `api/olay.js` olayları yazar; panel özetleri Supabase'deki `bb_ozet(p_gun)` fonksiyonundan tek çağrıda okur. Ham satırlar panele gitmez.

Gereken Vercel ortam değişkenleri: `SUPABASE_URL` ve `SUPABASE_ANAHTAR` (Supabase gizli anahtarı). Bunlar tanımlı değilse sayaç sessizce devre dışı kalır, site normal çalışır.

## İletişim formu

Form, Supabase'deki `iletisim_mesajlari` tablosuna yazar (yalnızca ekleme izni vardır). Gönderilen alanlar: `ad`, `eposta`, `konu`, `mesaj`.
