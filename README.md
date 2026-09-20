# bbasaran.net

Doç. Dr. Bora Başaran'ın kişisel akademik sitesi.

## Yapı

Tek dosyalık statik site. `index.html` içinde HTML, CSS ve JavaScript birlikte duruyor. Derleme adımı yok, bağımlılık yok.

## Yayın

Vercel bu repoyu izler. `main` dalına yapılan her commit siteyi otomatik günceller.

## İletişim formu

Form şu anda pasif. `index.html` içindeki `ENDPOINT` değişkeni `null` olduğu sürece form mesaj göndermez, ziyaretçiye formun hazırlandığını bildirir.

Supabase edge function adresi hazır olduğunda `ENDPOINT` değerine o adres yazılacak. Form o noktadan sonra JSON gönderir: `ad`, `eposta`, `konu`, `mesaj`.

## İçerik güncelleme

Yayın listesi, proje kartları ve araç bağlantıları doğrudan `index.html` içinde düzenlenir.
