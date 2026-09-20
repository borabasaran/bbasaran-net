(function(){
  // Supabase uc noktasi baglandiginda buraya adresi yazilacak
  var ENDPOINT = null;

  var azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cover = document.getElementById('cover');

  /* ---------- kapak katmanlari ---------- */
  if(cover && !azHareket){
    var mx = 0, my = 0, hedefX = 0, hedefY = 0, sy = 0, bekleyen = false;
    function ciz(){
      bekleyen = false;
      mx += (hedefX - mx) * 0.08;
      my += (hedefY - my) * 0.08;
      cover.style.setProperty('--mx', mx.toFixed(4));
      cover.style.setProperty('--my', my.toFixed(4));
      cover.style.setProperty('--sy', sy.toFixed(4));
      if(Math.abs(hedefX - mx) > 0.001 || Math.abs(hedefY - my) > 0.001){ istek(); }
    }
    function istek(){ if(!bekleyen){ bekleyen = true; requestAnimationFrame(ciz); } }
    window.addEventListener('pointermove', function(e){
      if(e.pointerType === 'touch') return;
      hedefX = (e.clientX / window.innerWidth) * 2 - 1;
      hedefY = (e.clientY / window.innerHeight) * 2 - 1;
      istek();
    }, {passive:true});
    window.addEventListener('scroll', function(){
      sy = Math.min((window.scrollY || 0) / Math.max(cover.offsetHeight, 1), 1);
      istek();
    }, {passive:true});
  }

  /* ---------- icerige in ---------- */
  var cue = document.getElementById('cue');
  var hedef = document.getElementById('icerik');
  if(cue && hedef){
    cue.addEventListener('click', function(){
      hedef.scrollIntoView({behavior: azHareket ? 'auto' : 'smooth', block:'start'});
    });
  }

  /* ---------- kaydirmaya bagli acilmalar ---------- */
  var acilacak = document.querySelectorAll('.reveal, .mask');
  if('IntersectionObserver' in window && !azHareket){
    var gozlemci = new IntersectionObserver(function(girisler){
      girisler.forEach(function(g){
        if(g.isIntersecting){
          g.target.classList.add('in');
          gozlemci.unobserve(g.target);
        }
      });
    }, {rootMargin:'0px 0px -12% 0px', threshold:0.12});
    acilacak.forEach(function(el){ gozlemci.observe(el); });
  } else {
    acilacak.forEach(function(el){ el.classList.add('in'); });
  }

  /* ---------- yatay proje seridi ---------- */
  var pin = document.getElementById('pin');
  var track = document.getElementById('track');
  var rail = document.getElementById('rail');
  var fill = document.getElementById('pinfill');
  var genis = window.matchMedia('(min-width: 861px)');

  function seritCiz(){
    if(!pin || !track || !rail) return;
    if(!genis.matches || azHareket){ track.style.transform = ''; return; }
    var kutu = pin.getBoundingClientRect();
    var yol = pin.offsetHeight - window.innerHeight;
    if(yol <= 0) return;
    var p = Math.min(Math.max(-kutu.top / yol, 0), 1);
    var kayma = Math.max(track.scrollWidth - rail.clientWidth, 0);
    track.style.transform = 'translate3d(' + (-p * kayma).toFixed(2) + 'px,0,0)';
    if(fill){ fill.style.transform = 'scaleX(' + p.toFixed(3) + ')'; }
  }

  /* ---------- okuma ilerlemesi ---------- */
  var progress = document.getElementById('progress');
  function ilerlemeCiz(){
    if(!progress) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? (window.scrollY || 0) / h : 0;
    progress.style.transform = 'scaleX(' + Math.min(Math.max(p,0),1).toFixed(4) + ')';
  }

  /* ---------- menude etkin bolum ---------- */
  var baglar = Array.prototype.slice.call(document.querySelectorAll('nav.bar a'));
  var bolumler = baglar.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  function menuCiz(){
    var y = (window.scrollY || 0) + window.innerHeight * 0.32;
    var etkin = -1;
    bolumler.forEach(function(b, i){
      if(b && b.offsetTop <= y){ etkin = i; }
    });
    baglar.forEach(function(a, i){ a.classList.toggle('aktif', i === etkin); });
  }

  var kuyruk = false;
  function tik(){
    kuyruk = false;
    seritCiz();
    ilerlemeCiz();
    menuCiz();
  }
  window.addEventListener('scroll', function(){
    if(!kuyruk){ kuyruk = true; requestAnimationFrame(tik); }
  }, {passive:true});
  window.addEventListener('resize', tik, {passive:true});
  tik();

  /* ---------- iletisim formu ---------- */
  var form = document.getElementById('mesaj');
  var durum = document.getElementById('f-durum');
  var gonder = document.getElementById('f-gonder');

  function isaretle(el, hatali){
    if(hatali){ el.setAttribute('aria-invalid','true'); }
    else { el.removeAttribute('aria-invalid'); }
  }

  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var ad = document.getElementById('f-ad');
      var mail = document.getElementById('f-mail');
      var mesaj = document.getElementById('f-mesaj');
      var tuzak = document.getElementById('f-tuzak');

      var hatalar = [];
      isaretle(ad, !ad.value.trim());
      if(!ad.value.trim()) hatalar.push('adınızı');
      var mailGecerli = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim());
      isaretle(mail, !mailGecerli);
      if(!mailGecerli) hatalar.push('geçerli bir e-posta adresi');
      isaretle(mesaj, mesaj.value.trim().length < 10);
      if(mesaj.value.trim().length < 10) hatalar.push('en az birkaç cümlelik mesaj');

      if(hatalar.length){
        durum.className = 'form-msg err';
        durum.textContent = 'Lütfen ' + hatalar.join(', ') + ' girin.';
        return;
      }
      if(tuzak.value){ return; }

      if(!ENDPOINT){
        durum.className = 'form-msg err';
        durum.textContent = 'İletişim formu şu anda hazırlanıyor. Kısa süre içinde etkin olacaktır.';
        return;
      }

      gonder.disabled = true;
      durum.className = 'form-msg';
      durum.textContent = 'Gönderiliyor...';

      fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          ad: ad.value.trim(),
          eposta: mail.value.trim(),
          konu: document.getElementById('f-konu').value,
          mesaj: mesaj.value.trim()
        })
      }).then(function(r){
        if(!r.ok) throw new Error('durum ' + r.status);
        durum.className = 'form-msg ok';
        durum.textContent = 'Mesajınız alındı. Birkaç iş günü içinde dönüş yapacağım.';
        form.reset();
      }).catch(function(){
        durum.className = 'form-msg err';
        durum.textContent = 'Mesaj gönderilemedi. Lütfen biraz sonra tekrar deneyin.';
      }).then(function(){
        gonder.disabled = false;
      });
    });
  }

  /* ---------- tema ---------- */
  var btn = document.getElementById('theme');
  if(btn){
    btn.addEventListener('click', function(){
      var root = document.documentElement;
      var cur = root.getAttribute('data-theme');
      var koyu = cur === 'dark' || (!cur && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.setAttribute('data-theme', koyu ? 'light' : 'dark');
      tik();
    });
  }
})();
