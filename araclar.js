/* bbasaran.net: kapaktaki iki şerit.
   1) Bilgi satırı: "Linkler" kutusu solda sabit durur; diğer bilgi kutuları
      ikişerli görünür, devamı sağdaki büyük okla gelir.
   2) Araç satırı: Okunabilirlik ölçer solda sabit; bağlantı kutuları ikişerli
      görünür, devamı yine okla gelir.
   Gizli kutular kaydırmayla değil, oklarla (ve dokunmatikte kaydırma
   hareketiyle) gösterilir; kapağın yüksekliği kutu sayısından etkilenmez. */
(function(){
  var kok = document.documentElement;
  var azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function sayfalayici(kap, kutular, ad){
    var GORUNEN = 2;
    var bas = 0;
    kap.classList.add('serit-sayfali');

    function okYap(yon, yazi, etiket){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'serit-ok ' + yon;
      b.textContent = yazi;
      b.setAttribute('aria-label', etiket);
      b.hidden = true;
      kap.appendChild(b);
      return b;
    }
    var sag = okYap('sag', '→', 'Sonraki ' + ad);
    var sol = okYap('sol', '←', 'Önceki ' + ad);

    /* okları görünen ilk ve son kutunun kenarına, dikey ortasına yerleştirir */
    function oklariYerlestir(){
      var gorunen = kutular.slice(bas, bas + GORUNEN);
      if(!gorunen.length) return;
      var k = kap.getBoundingClientRect();
      var ilk = gorunen[0].getBoundingClientRect();
      var son = gorunen[gorunen.length - 1].getBoundingClientRect();
      /* oklar kutuların dışına, boşluğa oturur; kapağın kırpan kenarından
         taşmasın diye yarıçap kadar içeride kalır (dar ekranda kutunun üstüne biner) */
      var yari = (sag.offsetWidth || 46) / 2;
      var sinir = (kap.closest('.cover-body') || document.body).getBoundingClientRect();
      var enSol = sinir.left + yari + 4 - k.left;
      var enSag = Math.min(sinir.right, window.innerWidth) - yari - 4 - k.left;
      sol.style.left = Math.max(ilk.left - k.left - yari - 6, enSol) + 'px';
      sol.style.top = (ilk.top - k.top + ilk.height / 2) + 'px';
      sag.style.left = Math.min(son.right - k.left + yari + 6, enSag) + 'px';
      sag.style.top = (son.top - k.top + son.height / 2) + 'px';
    }

    function goster(yeni, yon){
      bas = Math.max(0, Math.min(yeni, kutular.length - GORUNEN));
      kutular.forEach(function(el, i){
        var acik = i >= bas && i < bas + GORUNEN;
        var onceGizli = el.classList.contains('serit-gizli');
        el.classList.toggle('serit-gizli', !acik);
        el.classList.remove('gecis-sag', 'gecis-sol');
        if(acik && onceGizli && yon && !azHareket){
          void el.offsetWidth;
          el.classList.add(yon > 0 ? 'gecis-sag' : 'gecis-sol');
        }
      });
      sol.hidden = bas <= 0;
      sag.hidden = bas + GORUNEN >= kutular.length;
      oklariYerlestir();
    }

    sag.addEventListener('click', function(){ goster(bas + 1, 1); });
    sol.addEventListener('click', function(){ goster(bas - 1, -1); });

    /* dokunmatikte yana kaydırma hareketi de sayfa çevirir */
    var x0 = null, y0 = null;
    kap.addEventListener('touchstart', function(e){
      var t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY;
    }, { passive: true });
    kap.addEventListener('touchend', function(e){
      if(x0 === null) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - x0, dy = t.clientY - y0;
      x0 = null;
      if(Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      if(dx < 0) goster(bas + 1, 1); else goster(bas - 1, -1);
    }, { passive: true });

    var zaman = null;
    window.addEventListener('resize', function(){ clearTimeout(zaman); zaman = setTimeout(oklariYerlestir, 120); });
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(oklariYerlestir);
    goster(0, 0);
    /* açılış animasyonu bittikten sonra da bir kez yerleştir */
    setTimeout(oklariYerlestir, 1600);
  }

  /* ---------- 1) bilgi satırı ---------- */
  var facts = document.querySelector('.cover .facts');
  if(facts){
    var ogeler = Array.prototype.slice.call(facts.children);
    var sabit = ogeler.filter(function(li){
      var k = li.querySelector('.fact-k');
      return k && k.textContent.trim().toLocaleLowerCase('tr') === 'linkler';
    })[0];
    var akanlar = ogeler.filter(function(li){ return li !== sabit; });
    if(akanlar.length > 2){
      var sar = document.createElement('div');
      sar.className = 'facts-kap';
      facts.parentNode.insertBefore(sar, facts);
      sar.appendChild(facts);
      facts.classList.add('facts-serit');
      if(sabit){ sabit.classList.add('sabit'); facts.insertBefore(sabit, facts.firstChild); }
      sayfalayici(sar, akanlar, 'bilgiler');
      setTimeout(function(){ facts.classList.add('hazir'); }, 1500);
    }
  }

  /* ---------- 2) araç satırı ---------- */
  var serit = document.getElementById('aracSerit');
  if(serit){
    var kap = serit.parentNode;
    var kutular = Array.prototype.slice.call(serit.querySelectorAll('.arac-link'));
    if(!kutular.length){ kap.hidden = true; }
    else {
      /* tek satıra sığmayan başlığın tamamı imleç üzerine gelince görünsün */
      kutular.forEach(function(a){
        var b = a.querySelector('.arac-baslik');
        if(b && !a.title) a.title = b.textContent.trim();
      });
      sayfalayici(kap, kutular, 'araçlar');
    }
  }
})();
