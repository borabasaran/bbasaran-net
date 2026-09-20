(function(){
  // Supabase uc noktasi baglandiginda buraya adresi yazilacak
  var ENDPOINT = null;

  var azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cover = document.getElementById('cover');

  /* ---- kapak katmanlari: fare ve kaydirma ---- */
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
    function istek(){
      if(!bekleyen){ bekleyen = true; requestAnimationFrame(ciz); }
    }

    window.addEventListener('pointermove', function(e){
      if(e.pointerType === 'touch') return;
      var h = window.innerHeight, g = window.innerWidth;
      hedefX = (e.clientX / g) * 2 - 1;
      hedefY = (e.clientY / h) * 2 - 1;
      istek();
    }, {passive:true});

    window.addEventListener('scroll', function(){
      var y = window.scrollY || 0;
      sy = Math.min(y / Math.max(cover.offsetHeight, 1), 1);
      istek();
    }, {passive:true});
  }

  /* ---- icerige in ---- */
  var cue = document.getElementById('cue');
  var hedef = document.getElementById('icerik');
  if(cue && hedef){
    cue.addEventListener('click', function(){
      hedef.scrollIntoView({behavior: azHareket ? 'auto' : 'smooth', block:'start'});
    });
  }

  /* ---- iletisim formu ---- */
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

  /* ---- tema ---- */
  var btn = document.getElementById('theme');
  if(btn){
    btn.addEventListener('click', function(){
      var root = document.documentElement;
      var cur = root.getAttribute('data-theme');
      var koyu = cur === 'dark' || (!cur && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.setAttribute('data-theme', koyu ? 'light' : 'dark');
    });
  }
})();
