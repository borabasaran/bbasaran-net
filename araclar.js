/* bbasaran.net: kapaktaki araç şeridi. Bağlantı kutuları ölçerin yanındaki
   tek bir şeritte yana kayar; sağ ve sol ok düğmeleri bir kutu kaydırır.
   Kaç araç olursa olsun kapağın yüksekliği değişmez. */
(function(){
  var serit = document.getElementById('aracSerit');
  if(!serit) return;
  var kap = serit.parentNode;
  var kutular = Array.prototype.slice.call(serit.querySelectorAll('.arac-link'));
  if(!kutular.length){ kap.hidden = true; return; }

  /* tek satıra sığmayan başlığın tamamı imleç üzerine gelince görünsün */
  kutular.forEach(function(a){
    var b = a.querySelector('.arac-baslik');
    if(b && !a.title) a.title = b.textContent.trim();
  });

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
  var sag = okYap('sag', '→', 'Sonraki araçlar');
  var sol = okYap('sol', '←', 'Önceki araçlar');

  function adim(){
    var k = kutular[0].getBoundingClientRect().width;
    var bosluk = parseFloat(getComputedStyle(serit).columnGap) || 12;
    return k + bosluk;
  }
  function guncelle(){
    var en = serit.scrollWidth - serit.clientWidth;
    var x = serit.scrollLeft;
    var sagVar = en > 6 && x < en - 6;
    var solVar = en > 6 && x > 6;
    sag.hidden = !sagVar;
    sol.hidden = !solVar;
    serit.classList.toggle('sag-var', sagVar);
    serit.classList.toggle('sol-var', solVar);
  }
  sag.addEventListener('click', function(){ serit.scrollBy({ left: adim(), behavior: 'smooth' }); });
  sol.addEventListener('click', function(){ serit.scrollBy({ left: -adim(), behavior: 'smooth' }); });

  /* klavyeyle odaklanan kutu görünür alana kaysın */
  serit.addEventListener('focusin', function(e){
    if(e.target.scrollIntoView) e.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  serit.addEventListener('scroll', guncelle, { passive: true });
  var zaman = null;
  window.addEventListener('resize', function(){ clearTimeout(zaman); zaman = setTimeout(guncelle, 120); });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(guncelle);
  guncelle();
})();
