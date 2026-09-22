# bbasaran.net

Doç. Dr. Bora Başaran'ın kişisel akademik sitesi.

## Yapı

Statik site, derleme adımı yok:

- `index.html` — sayfanın tamamı; içerik blokları `<!-- AD:BASLA -->` ile `<!-- AD:BITTI -->` işaretleri arasındadır
- `data/site.json` — kapak, hakkımda, araştırma, çalışmalar, yöntem, iletişim metinleri
- `data/yayinlar.json` — makaleler ve kitap bölümleri
- `data/guncel.json` — güncel kitap çağrısı bandı
- `data/aday.json` — OpenAlex'te bulunan, henüz listede olmayan yayın adayları (siteye yansımaz)
- `lib/sayfa.js` — işaretli blokları verilerden üreten ortak modül
- `styles.css`, `cover.css`, `sekme.css`, `kitap.css` — biçim
- `app.js` — kapak, kitap kurgusu, okunabilirlik ölçer, form
- `scripts/guncelle.mjs` — aylık güncelleyici
- `scripts/uret.mjs` — sayfayı verilerden elle yeniden üretir

## İçeriği değiştirmek

Metinler `data/` altındaki JSON dosyalarındadır. İşaretli blokların içini elle düzenlemeyin; bir sonraki üretimde verilerden yeniden yazılır.

```
node scripts/uret.mjs   # index.html'i verilerden yeniden üretir
npm test                # index.html ile verilerin uyumunu denetler
```

Yöntem maddelerinde `[[terim]]` yazımı vurgulu terim olarak gösterilir. Kapaktaki bilgi satırlarında birden fazla satır varsa kapakta sırayla döner. Çalışma kartına `baglanti` eklenirse kartta bir bağlantı görünür; `renk` alanı `yesil` ya da `sari` olabilir.

## İçerik paneli

`bbasaran.net/panel` adresindeki panelden tüm metinler tarayıcıdan düzenlenebilir. Panel kaydettiğinde `data/` altındaki dosyaları ve `index.html`'i tek bir commit olarak `main` dalına yazar; Vercel siteyi bir iki dakika içinde günceller. Yayın adayları Yayınlar sekmesinde görünür: "ekle" ile listeye alınır, "Yok say" ile bir daha önerilmez.

- `panel/index.html` — panel arayüzü
- `api/panel.js` — şifreyi denetleyen ve GitHub'a yazan sunucu işlevi

Vercel ortam değişkenleri (Settings → Environment Variables):

- `PANEL_SIFRESI` — panelin giriş şifresi
- `GITHUB_TOKEN` — yalnızca bu depoya, yalnızca Contents okuma/yazma izni olan ince ayarlı (fine-grained) token
- `GITHUB_REPO` (isteğe bağlı, varsayılan `borabasaran/bbasaran-net`), `GITHUB_BRANCH` (isteğe bağlı, varsayılan `main`)

Aynı anda iki yerden düzenleme yapılırsa ikinci kayıt reddedilir ve panel yeniden yüklemeyi önerir; böylece kimse ötekinin değişikliğini ezmez.

## Yayın

Vercel `main` dalını izler. Her commit siteyi otomatik günceller.

## Aylık güncelleme

`.github/workflows/guncelle.yml` her ayın 1'inde çalışır. Actions sekmesinden elle de tetiklenebilir.

Görev iki iş yapar:

1. **Tam otomatik:** `kitap.bbasaran.net` sayfasından güncel kitap başlığını alır, menünün altındaki şeride yazar.
2. **Onaya bırakır:** OpenAlex'te bulunup `data/yayinlar.json` içinde görünmeyen kayıtları `data/aday.json` dosyasına yazar. **Siteye yansımaz.** `yoksayilanlar` listesindeki başlıklar aday olarak yeniden önerilmez.

OpenAlex aynı çalışmanın çeviri başlıklı kaydını ayrı bir yayın gibi döndürebildiği için otomatik ekleme kapatılmıştır. Gerçekten yeni olanları doğru künyesiyle `data/yayinlar.json` içine taşıyın.

## İletişim formu

Form, Supabase'deki `iletisim_mesajlari` tablosuna yazar (yalnızca ekleme izni vardır). Gönderilen alanlar: `ad`, `eposta`, `konu`, `mesaj`.
