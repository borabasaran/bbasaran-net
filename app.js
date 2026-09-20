(function(){
  // Supabase uc noktasi baglandiginda buraya adresi yazilacak
  var ENDPOINT = null;

  var azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var inceImlec = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var cover = document.getElementById('cover');

  /* ==================== ACILIS PERDESI ==================== */
  var perde = document.getElementById('perde');
  if(perde){
    var gorulduMu = false;
    try { gorulduMu = sessionStorage.getItem('perde') === '1'; } catch(e){}
    if(azHareket || gorulduMu){
      perde.remove();
    } else {
      try { sessionStorage.setItem('perde','1'); } catch(e){}
      document.body.style.overflow = 'hidden';
      setTimeout(function(){
        perde.classList.add('bitti');
        document.body.style.overflow = '';
        setTimeout(function(){ if(perde.parentNode){ perde.remove(); } }, 950);
      }, 1150);
    }
  }

  /* ==================== HARF ALANI (canvas) ==================== */
  var alan = document.getElementById('alan');
  if(alan && !azHareket){
    var ctx = alan.getContext('2d');
    var harfler = 'abcdefghijklmnoprstuvwyzäöüß'.split('');
    var zerreler = [];
    var G = 0, Y = 0, dpr = 1;
    var fx = -9999, fy = -9999;
    var calisiyor = true;

    function olcuAl(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      G = cover.clientWidth;
      Y = cover.clientHeight;
      alan.width = Math.floor(G * dpr);
      alan.height = Math.floor(Y * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function kur(){
      olcuAl();
      var adet = G < 700 ? 42 : (G < 1200 ? 80 : 120);
      zerreler = [];
      for(var i = 0; i < adet; i++){
        zerreler.push({
          x: Math.random() * G,
          y: Math.random() * Y,
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.14,
          b: 9 + Math.random() * 15,
          o: 0.05 + Math.random() * 0.13,
          p: 0,
          h: harfler[(Math.random() * harfler.length) | 0]
        });
      }
    }

    function ciz(){
      if(!calisiyor) return;
      ctx.clearRect(0, 0, G, Y);
      for(var i = 0; i < zerreler.length; i++){
        var z = zerreler[i];
        z.x += z.vx; z.y += z.vy;
        if(z.x < -30) z.x = G + 30;
        if(z.x > G + 30) z.x = -30;
        if(z.y < -30) z.y = Y + 30;
        if(z.y > Y + 30) z.y = -30;

        var dx = z.x - fx, dy = z.y - fy;
        var u2 = dx * dx + dy * dy;
        var yakin = u2 < 26000;
        z.p += ((yakin ? 1 : 0) - z.p) * 0.08;

        if(yakin){
          var u = Math.sqrt(u2) || 1;
          z.x += (dx / u) * 0.5 * z.p;
          z.y += (dy / u) * 0.5 * z.p;
        }

        var op = z.o + z.p * 0.5;
        var bo = z.b + z.p * 7;
        ctx.font = '600 ' + bo.toFixed(1) + 'px "IBM Plex Mono", monospace';
        ctx.fillStyle = 'rgba(' + (200 + 55 * z.p).toFixed(0) + ',' + (236 - 30 * z.p).toFixed(0) + ',' + (226 - 60 * z.p).toFixed(0) + ',' + op.toFixed(3) + ')';
        ctx.fillText(z.h, z.x, z.y);
      }
      requestAnimationFrame(ciz);
    }

    kur();
    requestAnimationFrame(ciz);

    window.addEventListener('resize', function(){ kur(); }, {passive:true});
    window.addEventListener('pointermove', function(e){
      if(e.pointerType === 'touch') return;
      var k = cover.getBoundingClientRect();
      fx = e.clientX - k.left;
      fy = e.clientY - k.top;
    }, {passive:true});

    if('IntersectionObserver' in window){
      new IntersectionObserver(function(g){
        var gorunur = g[0].isIntersecting;
        if(gorunur && !calisiyor){ calisiyor = true; requestAnimationFrame(ciz); }
        else if(!gorunur){ calisiyor = false; }
      }, {threshold:0}).observe(cover);
    }
  }

  /* ==================== KAPAK KATMANLARI ==================== */
  if(cover && !azHareket){
    var mx = 0, my = 0, hx = 0, hy = 0, sy = 0, bekleyen = false;
    function katmanCiz(){
      bekleyen = false;
      mx += (hx - mx) * 0.08;
      my += (hy - my) * 0.08;
      cover.style.setProperty('--mx', mx.toFixed(4));
      cover.style.setProperty('--my', my.toFixed(4));
      cover.style.setProperty('--sy', sy.toFixed(4));
      if(Math.abs(hx - mx) > 0.001 || Math.abs(hy - my) > 0.001){ katmanIstek(); }
    }
    function katmanIstek(){ if(!bekleyen){ bekleyen = true; requestAnimationFrame(katmanCiz); } }
    window.addEventListener('pointermove', function(e){
      if(e.pointerType === 'touch') return;
      hx = (e.clientX / window.innerWidth) * 2 - 1;
      hy = (e.clientY / window.innerHeight) * 2 - 1;
      katmanIstek();
    }, {passive:true});
    window.addEventListener('scroll', function(){
      sy = Math.min((window.scrollY || 0) / Math.max(cover.offsetHeight, 1), 1);
      katmanIstek();
    }, {passive:true});
  }

  /* ==================== OZEL IMLEC + MIKNATIS ==================== */
  if(inceImlec && !azHareket){
    document.documentElement.classList.add('ince-imlec');
    var imlec = document.getElementById('imlec');
    if(imlec){
      var ix = -100, iy = -100, hix = -100, hiy = -100, ibek = false;
      function imlecCiz(){
        ibek = false;
        ix += (hix - ix) * 0.18;
        iy += (hiy - iy) * 0.18;
        imlec.style.transform = 'translate3d(' + ix.toFixed(1) + 'px,' + iy.toFixed(1) + 'px,0)';
        if(Math.abs(hix - ix) > 0.4 || Math.abs(hiy - iy) > 0.4){ imlecIstek(); }
      }
      function imlecIstek(){ if(!ibek){ ibek = true; requestAnimationFrame(imlecCiz); } }
      window.addEventListener('pointermove', function(e){
        if(e.pointerType === 'touch') return;
        hix = e.clientX; hiy = e.clientY;
        imlec.classList.add('acik');
        imlecIstek();
      }, {passive:true});
      document.addEventListener('pointerover', function(e){
        var hedef = e.target.closest('a, button, input, select, textarea, .card, .field');
        imlec.classList.toggle('buyuk', !!hedef);
      });
      window.addEventListener('blur', function(){ imlec.classList.remove('acik'); });
    }

    // kartlarin imlece yaslanmasi
    Array.prototype.forEach.call(document.querySelectorAll('.card'), function(k){
      k.addEventListener('pointermove', function(e){
        var r = k.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        k.style.transform = 'translate3d(' + (dx * 9).toFixed(2) + 'px,' + (dy * 9 - 6).toFixed(2) + 'px,0)';
      });
      k.addEventListener('pointerleave', function(){ k.style.transform = ''; });
    });
  }

  /* ==================== OKUNABILIRLIK OLCER ==================== */
  var girdi = document.getElementById('probe-in');
  if(girdi){
    var cikti = document.getElementById('probe-band');
    var lixEl = document.getElementById('probe-lix');
    var dolgu = document.getElementById('probe-fill');

    function heceSay(s){
      var g = s.toLowerCase().match(/[aeiouyäöü]+/g);
      var n = g ? g.length : 0;
      if(/[^aeiouyäöü]e$/i.test(s) && n > 1){ n -= 1; }
      return Math.max(n, 1);
    }

    function olc(){
      var m = girdi.value.trim();
      if(m.length < 12){
        cikti.textContent = '—';
        lixEl.textContent = 'LIX —';
        dolgu.style.transform = 'scaleX(0)';
        return;
      }
      var cumleler = m.split(/[.!?:;…]+/).filter(function(c){ return c.trim().length > 0; });
      var sozcukler = m.match(/[\p{L}\p{M}]+/gu) || [];
      if(!sozcukler.length){ return; }
      var c = Math.max(cumleler.length, 1);
      var asl = sozcukler.length / c;
      var toplamHece = 0, uzun = 0;
      sozcukler.forEach(function(s){
        toplamHece += heceSay(s);
        if(s.length > 6) uzun++;
      });
      var asw = toplamHece / sozcukler.length;

      // Amstad (Almanca Flesch)
      var fre = 180 - asl - (58.5 * asw);
      fre = Math.max(0, Math.min(100, fre));
      // LIX
      var lix = asl + (100 * uzun / sozcukler.length);

      var band;
      if(fre >= 70) band = 'Çok kolay · A1–A2';
      else if(fre >= 60) band = 'Kolay · A2–B1';
      else if(fre >= 50) band = 'Orta · B1';
      else if(fre >= 40) band = 'Orta zor · B2';
      else if(fre >= 30) band = 'Zor · B2–C1';
      else band = 'Çok zor · C1–C2';

      cikti.textContent = band;
      lixEl.textContent = 'LIX ' + lix.toFixed(0);
      dolgu.style.transform = 'scaleX(' + (fre / 100).toFixed(3) + ')';
    }

    girdi.addEventListener('input', olc);
    olc();
  }

  /* ==================== ICERIGE IN ==================== */
  var cue = document.getElementById('cue');
  var hedefBolum = document.getElementById('icerik');
  if(cue && hedefBolum){
    cue.addEventListener('click', function(){
      hedefBolum.scrollIntoView({behavior: azHareket ? 'auto' : 'smooth', block:'start'});
    });
  }

  /* ==================== ACILMALAR ==================== */
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
    Array.prototype.forEach.call(acilacak, function(el){ gozlemci.observe(el); });
  } else {
    Array.prototype.forEach.call(acilacak, function(el){ el.classList.add('in'); });
  }

  /* ==================== YATAY SERIT / ILERLEME / MENU ==================== */
  var pin = document.getElementById('pin');
  var track = document.getElementById('track');
  var rail = document.getElementById('rail');
  var pinFill = document.getElementById('pinfill');
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
    if(pinFill){ pinFill.style.transform = 'scaleX(' + p.toFixed(3) + ')'; }
  }

  var progress = document.getElementById('progress');
  function ilerlemeCiz(){
    if(!progress) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? (window.scrollY || 0) / h : 0;
    progress.style.transform = 'scaleX(' + Math.min(Math.max(p,0),1).toFixed(4) + ')';
  }

  var baglar = Array.prototype.slice.call(document.querySelectorAll('nav.bar a'));
  var bolumler = baglar.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  function menuCiz(){
    var y = (window.scrollY || 0) + window.innerHeight * 0.32;
    var etkin = -1;
    bolumler.forEach(function(b, i){ if(b && b.offsetTop <= y){ etkin = i; } });
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

  /* ==================== ILETISIM FORMU ==================== */
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

  /* ==================== TEMA ==================== */
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
