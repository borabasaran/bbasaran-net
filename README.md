# bbasaran.net

Doç. Dr. Bora Başaran'ın kişisel akademik sitesi.

## Yapı

Statik site, derleme adımı yok:

- `index.html` — sayfanın tamamı
- `styles.css` — genel biçim
- `cover.css` — kapak, perde, ölçer
- `app.js` — kapak katmanları, açılmalar, okunabilirlik ölçer, form
- `data/` — içerik verisi
- `scripts/guncelle.mjs` — aylık güncelleyici

## Yayın

Vercel `main` dalını izler. Her commit siteyi otomatik günceller.

## Aylık güncelleme

`.github/workflows/guncelle.yml` her ayın 1'inde çalışır. Actions sekmesinden elle de tetiklenebilir.

Görev iki iş yapar:

1. **Tam otomatik:** `kitap.bbasaran.net` sayfasından güncel kitap başlığını alır, menünün altındaki şeride yazar.
2. **Onaya bırakır:** OpenAlex'te bulunup `data/yayinlar.json` içinde görünmeyen kayıtları `data/aday.json` dosyasına yazar. **Siteye yansımaz.**

OpenAlex aynı çalışmanın çeviri başlıklı kaydını ayrı bir yayın gibi döndürebildiği için otomatik ekleme kapatılmıştır. Ayda bir `data/aday.json` dosyasına bakın; gerçekten yeni olanları doğru künyesiyle `data/yayinlar.json` içine taşıyın, görev bir sonraki çalışmada sayfayı yeniden üretir.

## İletişim formu

`app.js` içindeki `ENDPOINT` değişkeni `null` olduğu sürece form mesaj göndermez, ziyaretçiye hazırlandığını bildirir. Supabase uç noktası hazır olduğunda adres oraya yazılır; form JSON gönderir: `ad`, `eposta`, `konu`, `mesaj`.
