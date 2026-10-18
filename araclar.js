/* bbasaran.net: kapaktaki araç kutuları, sığmayanlar düğmeyle açılır. */
(function(){
  var kok = document.documentElement;
  /* ==================== KAPAKTAKİ ARAÇLAR: FAZLASI ====================
     Bağlantı kutusu sayısı sınırsızdır. Kapak tek ekrana sığsın diye sığan
     kadar tam satır gösterilir (en az bir satır); gizlenen kutular
     "+N araç daha" düğmesiyle açılır. Açıkken kapağın ortası kendi içinde kayar.
     Katlanan kapak yoksa (hareket azaltma açık) en fazla iki bağlantı satırı gösterilir. */
  var aracKap = document.querySelector('.araclar');
  var aracGovde = aracKap ? aracKap.closest('.cover-body') : null;
  if(aracKap){
    var aracLink = Array.prototype.slice.call(aracKap.querySelectorAll('.arac-link'));
    aracLink.forEach(function(a){
      var b = a.querySelector('.arac-baslik');
      if(b && !a.title) a.title = b.textContent.trim();
    });
    var aracDaha = document.createElement('button');
    aracDaha.type = 'button';
    aracDaha.className = 'arac-daha';
    aracDaha.hidden = true;
    aracKap.appendChild(aracDaha);

    var aracGoster = function(n){
      aracLink.forEach(function(a, i){ a.classList.toggle('arac-gizli', i >= n); });
    };
    var aracSigdir = function(){
      var toplam = aracLink.length;
      var acik = aracKap.classList.contains('acik');
      var n = toplam;
      aracGoster(toplam);
      aracDaha.hidden = true;
      if(!acik && toplam > 1){
        /* ilk bağlantı satırı her zaman görünür; sonraki satırlar kapağa sığmazsa sondan gizlenir */
        var ilkSatir = aracLink[0].offsetTop;
        if(kok.classList.contains('katlanir') && aracGovde){
          aracDaha.hidden = false;
          aracDaha.textContent = '+0 araç daha';
          while(n > 0 && aracLink[n - 1].offsetTop > ilkSatir && aracGovde.scrollHeight > aracGovde.clientHeight + 1){
            var satir = aracLink[n - 1].offsetTop;
            while(n > 0 && aracLink[n - 1].offsetTop === satir) n--;
            aracGoster(n);
            aracDaha.textContent = '+' + (toplam - n) + ' araç daha';
          }
        } else {
          /* katlanan kapak yoksa en fazla iki bağlantı satırı */
          var satirlar = [];
          aracLink.forEach(function(a){ if(satirlar.indexOf(a.offsetTop) < 0) satirlar.push(a.offsetTop); });
          if(satirlar.length > 2){
            while(n > 0 && aracLink[n - 1].offsetTop > satirlar[1]) n--;
            aracGoster(n);
          }
        }
      }
      var fazla = toplam - n;
      aracDaha.hidden = acik ? false : fazla <= 0;
      aracDaha.textContent = acik ? 'Daha az göster' : '+' + fazla + ' araç daha';
      aracDaha.setAttribute('aria-expanded', acik ? 'true' : 'false');
    };
    aracDaha.addEventListener('click', function(){
      var acilacak = !aracKap.classList.contains('acik');
      aracKap.classList.toggle('acik', acilacak);
      aracSigdir();
      if(!acilacak && aracGovde) aracGovde.scrollTop = 0;
    });
    var aracZaman = null;
    window.addEventListener('resize', function(){
      clearTimeout(aracZaman);
      aracZaman = setTimeout(aracSigdir, 150);
    });
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(aracSigdir);
    aracSigdir();
  }
})();
