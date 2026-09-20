(function(){
  // Supabase uc noktasi baglandiginda buraya adresi yazilacak
  var ENDPOINT = null;

  var kok = document.documentElement;
  var azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var inceImlec = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var cover = document.getElementById('cover');

  var sayfalar = Array.prototype.slice.call(document.querySelectorAll('.sayfa'));
  var baglar = Array.prototype.slice.call(document.querySelectorAll('nav.bar a'));
  var kitapModu = sayfalar.length > 1 && !azHareket;
  var etkinSayfa = 0;
  var gecisKilidi = false;

  var kontrol = document.getElementById('sayfaKontrol');
  var oncekiDug = document.getElementById('onceki');
  var sonrakiDug = document.getElementById('sonraki');
  var sayfaNo = document.getElementById('sayfaNo');
  var progress = document.getElementById('progress');
  var sahne = null;

  /* ==================== KITAP KURULUMU ==================== */
  if(kitapModu){
    kok.classList.add('kitap');

    // sayfalari tek bir sahne icine al
    sahne = document.createElement('div');
    sahne.className = 'sahne';
    sayfalar[0].parentNode.insertBefore(sahne, sayfalar[0]);
    sayfalar.forEach(function(s){ sahne.appendChild(s); });

    // her sayfanin sonuna ipucu satiri
    sayfalar.forEach(function(s, i){
      var ipucu = document.createElement('p');
      ipucu.className = 'sayfa-son';
      var kap = s.querySelector('.wrap') || s;
      if(i < sayfalar.length - 1){
        ipucu.innerHTML = '<i></i><span>Kaydırmaya devam edin</span><i></i>';
      } else {
        ipucu.innerHTML = '<i></i><span>Kitabın sonu</span><i></i>';
      }
      kap.appendChild(ipucu);
    });

    // tema dugmesini ve telif satirini alt cubuga tasi
    var tema = document.getElementById('theme');
    if(tema && kontrol){
      var telif = document.createElement('span');
      telif.className = 'kitap-alt';
      telif.textContent = '© 2026 Bora Başaran';
      kontrol.appendChild(telif);
      kontrol.appendChild(tema);
    }
  }

  /* ==================== KATLANAN KAPAK ==================== */
  var katlanir = !!cover && !azHareket;
  var acik = false;

  if(katlanir){
    kok.classList.add('katlanir');
    document.body.classList.add('kapali');
  }

  function kapagiAc(){
    if(!katlanir || acik) return;
    acik = true;
    cover.classList.add('acildi');
    document.body.classList.remove('kapali');
    if(kontrol) kontrol.hidden = false;
    kontroluGuncelle();
    setTimeout(function(){ cover.classList.add('gizli'); }, 1250);
  }

  var cue = document.getElementById('cue');
  if(cue) cue.addEventListener('click', kapagiAc);

  /* ==================== SAYFA GECISI ==================== */
  function acilmalariTetikle(kap){
    var ogeler = kap.querySelectorAll('.reveal, .mask');
    Array.prototype.forEach.call(ogeler, function(el){ el.classList.remove('in'); });
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        Array.prototype.forEach.call(ogeler, function(el){ el.classList.add('in'); });
      });
    });
  }

  function kontroluGuncelle(){
    if(!kitapModu) return;
    if(oncekiDug) oncekiDug.disabled = etkinSayfa === 0;
    if(sonrakiDug) sonrakiDug.disabled = etkinSayfa === sayfalar.length - 1;
    if(sayfaNo){
      sayfaNo.textContent = ('0' + (etkinSayfa + 1)).slice(-2) + ' / '
        + ('0' + sayfalar.length).slice(-2);
    }
    if(progress){
      progress.style.transform = 'scaleX(' + ((etkinSayfa + 1) / sayfalar.length).toFixed(3) + ')';
    }
    baglar.forEach(function(a, i){ a.classList.toggle('aktif', i === etkinSayfa); });
  }

  function sayfaGoster(i, yon){
    if(!kitapModu) return;
    i = Math.min(Math.max(i, 0), sayfalar.length - 1);
    if(i === etkinSayfa && sayfalar[i].classList.contains('aktif')) return;

    sayfalar.forEach(function(s){ s.classList.remove('aktif', 'geri'); });
    var s = sayfalar[i];
    if(yon === 'geri') s.classList.add('geri');
    s.classList.add('aktif');
    s.scrollTop = yon === 'geri' ? s.scrollHeight : 0;
    etkinSayfa = i;
    acilmalariTetikle(s);
    kontroluGuncelle();
    if(s.id){
      try { history.replaceState(null, '', '#' + s.id); } catch(e){}
    }

    gecisKilidi = true;
    setTimeout(function(){ gecisKilidi = false; }, 620);
  }

  function ileri(){ sayfaGoster(etkinSayfa + 1, 'ileri'); }
  function geri(){ sayfaGoster(etkinSayfa - 1, 'geri'); }

  if(kitapModu){
    baglar.forEach(function(a, i){
      a.addEventListener('click', function(e){
        e.preventDefault();
        if(!acik && katlanir) kapagiAc();
        sayfaGoster(i, i < etkinSayfa ? 'geri' : 'ileri');
      });
    });

    if(oncekiDug) oncekiDug.addEventListener('click', geri);
    if(sonrakiDug) sonrakiDug.addEventListener('click', ileri);

    /* --- tekerlek: sayfa sonuna gelince cevir --- */
    sahne.addEventListener('wheel', function(e){
      if(!acik || gecisKilidi) return;
      var s = sayfalar[etkinSayfa];
      var altta = s.scrollTop + s.clientHeight >= s.scrollHeight - 3;
      var ustte = s.scrollTop <= 3;
      if(e.deltaY > 0 && altta && etkinSayfa < sayfalar.length - 1){
        e.preventDefault();
        ileri();
      } else if(e.deltaY < 0 && ustte && etkinSayfa > 0){
        e.preventDefault();
        geri();
      }
    }, {passive:false});

    /* --- dokunma --- */
    var baslangicY = null;
    sahne.addEventListener('touchstart', function(e){
      baslangicY = e.touches[0].clientY;
    }, {passive:true});
    sahne.addEventListener('touchend', function(e){
      if(!acik || gecisKilidi || baslangicY === null) return;
      var fark = baslangicY - (e.changedTouches[0] ? e.changedTouches[0].clientY : baslangicY);
      baslangicY = null;
      if(Math.abs(fark) < 60) return;
      var s = sayfalar[etkinSayfa];
      var altta = s.scrollTop + s.clientHeight >= s.scrollHeight - 3;
      var ustte = s.scrollTop <= 3;
      if(fark > 0 && altta) ileri();
      else if(fark < 0 && ustte) geri();
    }, {passive:true});

    /* --- klavye --- */
    window.addEventListener('keydown', function(e){
      var et = document.activeElement;
      if(et && /^(INPUT|TEXTAREA|SELECT)$/.test(et.tagName)) return;

      if(!acik && katlanir){
        if(['ArrowDown','ArrowRight','PageDown',' ','Enter'].indexOf(e.key) >= 0) kapagiAc();
        return;
      }
      if(e.key === 'ArrowRight' || e.key === 'PageDown'){ e.preventDefault(); ileri(); }
      else if(e.key === 'ArrowLeft' || e.key === 'PageUp'){ e.preventDefault(); geri(); }
    });

    /* --- kapak kapaliyken kaydirma da acsin --- */
    if(katlanir){
      window.addEventListener('wheel', function(e){
        if(!acik && e.deltaY > 6) kapagiAc();
      }, {passive:true});
      var kapakY = null;
      window.addEventListener('touchstart', function(e){ kapakY = e.touches[0].clientY; }, {passive:true});
      window.addEventListener('touchmove', function(e){
        if(acik || kapakY === null) return;
        if(kapakY - e.touches[0].clientY > 28) kapagiAc();
      }, {passive:true});
    }

    /* --- adres satirindaki bolum --- */
    var baslangic = 0;
    if(location.hash){
      sayfalar.forEach(function(s, i){ if('#' + s.id === location.hash) baslangic = i; });
      if(baslangic > 0 && katlanir){
        acik = true;
        cover.classList.add('gizli');
        document.body.classList.remove('kapali');
      }
    }
    sayfaGoster(baslangic, 'ileri');
    if(kontrol) kontrol.hidden = !acik;
  }

  /* ==================== ACILIS PERDESI ==================== */
  var perde = document.getElementById('perde');
  if(perde){
    var gorulduMu = false;
    try { gorulduMu = sessionStorage.getItem('perde') === '1'; } catch(e){}
    if(azHareket || gorulduMu || acik){
      perde.remove();
    } else {
      try { sessionStorage.setItem('perde','1'); } catch(e){}
      setTimeout(function(){
        perde.classList.add('bitti');
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
      if(e.pointerType === 'touch' || acik) return;
      var k = cover.getBoundingClientRect();
      fx = e.clientX - k.left;
      fy = e.clientY - k.top;
    }, {passive:true});
  }

  /* ==================== KAPAK KATMANLARI ==================== */
  if(cover && !azHareket){
    var mx = 0, my = 0, hx = 0, hy = 0, bekleyen = false;
    function katmanCiz(){
      bekleyen = false;
      mx += (hx - mx) * 0.08;
      my += (hy - my) * 0.08;
      cover.style.setProperty('--mx', mx.toFixed(4));
      cover.style.setProperty('--my', my.toFixed(4));
      if(Math.abs(hx - mx) > 0.001 || Math.abs(hy - my) > 0.001){ katmanIstek(); }
    }
    function katmanIstek(){ if(!bekleyen){ bekleyen = true; requestAnimationFrame(katmanCiz); } }
    window.addEventListener('pointermove', function(e){
      if(e.pointerType === 'touch' || acik) return;
      hx = (e.clientX / window.innerWidth) * 2 - 1;
      hy = (e.clientY / window.innerHeight) * 2 - 1;
      katmanIstek();
    }, {passive:true});
  }

  /* ==================== MIKNATIS ==================== */
  if(inceImlec && !azHareket){
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

      var fre = 180 - asl - (58.5 * asw);
      fre = Math.max(0, Math.min(100, fre));
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

  /* ==================== KAYDIRMALI KURGU (kitap disi) ==================== */
  if(!kitapModu){
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

    var ilerlemeCiz = function(){
      if(!progress) return;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY || 0) / h : 0;
      progress.style.transform = 'scaleX(' + Math.min(Math.max(p,0),1).toFixed(4) + ')';
    };
    window.addEventListener('scroll', ilerlemeCiz, {passive:true});
    ilerlemeCiz();
  }

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
      var cur = kok.getAttribute('data-theme');
      var koyu = cur === 'dark' || (!cur && window.matchMedia('(prefers-color-scheme: dark)').matches);
      kok.setAttribute('data-theme', koyu ? 'light' : 'dark');
    });
  }
})();
