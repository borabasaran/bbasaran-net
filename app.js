(function(){
  // Supabase uc noktasi baglandiginda buraya adresi yazilacak
  var ENDPOINT = null;

  var cover = document.getElementById('cover');
  var tab = document.getElementById('tab');
  var target = document.getElementById('icerik');

  if(tab){
    tab.addEventListener('click', function(){
      cover.classList.add('opened');
      setTimeout(function(){
        target.scrollIntoView({behavior:'smooth', block:'start'});
      }, 320);
      setTimeout(function(){ cover.classList.remove('opened'); }, 1600);
    });
  }

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

  var btn = document.getElementById('theme');
  if(btn){
    btn.addEventListener('click', function(){
      var root = document.documentElement;
      var cur = root.getAttribute('data-theme');
      var isDark = cur === 'dark' || (!cur && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.setAttribute('data-theme', isDark ? 'light' : 'dark');
    });
  }
})();
