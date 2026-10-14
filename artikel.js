/* ===== ARTİKEL AVCISI =====
   Kapaktaki küçük oyun. Ekranın üstünde bir Almanca ad belirir, altta
   der, die, das blokları iner; kalem doğru artikeli vurur. Kimse
   dokunmazsa sahne kendi oynar; bloğa dokunulunca ya da ok tuşları ve
   boşlukla oyunu ziyaretçi devralır. Her beş doğruda seviye artar ve
   sözcükler sıklık bandında yukarı çıkar. Ses varsayılan olarak kapalıdır.
   Hareket kısıtlıysa sahne tek bir durağan kare olarak çizilir. */
(function(){
  var ekran = document.getElementById('artikel');
  if(!ekran || !ekran.getContext) return;
  var x = ekran.getContext('2d');
  var sesDug = document.getElementById('oyun-ses');
  var azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ZEMIN = '#07262A', KREM = '#F3E9D2', SOLUK = '#5f8a8a', SONUK = '#1d4a4f', CIZGI = '#0d3a40';
  var YAZI = '"IBM Plex Mono", ui-monospace, monospace';

  /* ad, artikel, Türkçe karşılık, sıklık bandı (1 en sık) */
  var SOZLUK = [
    ['Buch','das','kitap',1], ['Tisch','der','masa',1], ['Lampe','die','lamba',1],
    ['Fenster','das','pencere',1], ['Stuhl','der','sandalye',1], ['Tür','die','kapı',1],
    ['Schule','die','okul',1], ['Kind','das','çocuk',1], ['Tag','der','gün',1],
    ['Zeitung','die','gazete',2], ['Wetter','das','hava',2], ['Bahnhof','der','istasyon',2],
    ['Prüfung','die','sınav',2], ['Gespräch','das','konuşma',2], ['Unterricht','der','ders',2],
    ['Erfahrung','die','deneyim',3], ['Ergebnis','das','sonuç',3], ['Zusammenhang','der','bağlam',3],
    ['Forschung','die','araştırma',3], ['Verfahren','das','yöntem',3], ['Wortschatz','der','söz varlığı',3],
    ['Herausforderung','die','meydan okuma',4], ['Verhältnis','das','ilişki',4], ['Anspruch','der','talep',4],
    ['Bewertung','die','değerlendirme',4], ['Gutachten','das','bilirkişi raporu',4], ['Maßstab','der','ölçüt',4]
  ];
  var KALEM = ['...1...','..121..','..121..','.11111.','.13331.','1133311','11.1.11'];
  var KALEM_RENK = {1:KREM, 2:SOLUK, 3:'#9fb8b4'};

  /* ölçüler: genişlik kutuya göre, yükseklik dar ekranda biraz artar */
  var W = 640, H = 112, dar = false, Y0 = 26, PY = 98, BG = 64, XS = [150, 320, 490];
  function olcule(){
    var g = Math.round(ekran.clientWidth || ekran.parentNode.clientWidth || 640);
    W = Math.max(280, g);
    dar = W < 520;
    H = dar ? 140 : 112;
    Y0 = dar ? 40 : 26;
    PY = H - 24;
    BG = Math.min(64, Math.round(W * 0.2));
    XS = [Math.round(W * 0.23), Math.round(W * 0.5), Math.round(W * 0.77)];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    ekran.style.height = H + 'px';
    ekran.width = Math.round(W * dpr);
    ekran.height = Math.round(H * dpr);
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    if(D.cols) D.cols.forEach(function(c, k){ c.x = XS[k]; });
    D.sx = Math.min(Math.max(D.sx, 20), W - 20);
  }

  var ses = false, sesBag = null;
  function bip(f, s){
    if(!ses) return;
    try{
      sesBag = sesBag || new (window.AudioContext || window.webkitAudioContext)();
      var o = sesBag.createOscillator(), g = sesBag.createGain();
      o.type = 'square'; o.frequency.value = f; g.gain.value = 0.035;
      o.connect(g); g.connect(sesBag.destination);
      o.start(); o.stop(sesBag.currentTime + s);
    }catch(e){}
  }
  if(sesDug){
    sesDug.addEventListener('click', function(){
      ses = !ses;
      sesDug.textContent = ses ? 'Ses açık' : 'Ses kapalı';
      sesDug.setAttribute('aria-pressed', ses ? 'true' : 'false');
    });
  }

  var D = {sev:1, dogru:0, puan:0, y:26, cols:null, sx:320, mermi:null, vurulan:-1, bekle:0,
           ad:null, el:-999, t:0, not:null, sevYazi:0, sasir:false, sasti:false, hedef:null, atesle:false};

  function sec(){
    var havuz = SOZLUK.filter(function(n){ return n[3] <= D.sev; });
    if(Math.random() < 0.6){
      var bu = havuz.filter(function(n){ return n[3] === D.sev; });
      if(bu.length) havuz = bu;
    }
    var n;
    do { n = havuz[Math.floor(Math.random() * havuz.length)]; } while(havuz.length > 1 && n === D.ad);
    return n;
  }
  function karistir(a){
    for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function yeniTur(){
    D.ad = sec();
    D.cols = karistir(['der','die','das']).map(function(t, k){ return {t:t, x:XS[k], sars:0}; });
    D.y = Y0; D.vurulan = -1; D.mermi = null;
    D.sasir = Math.random() < 0.25; D.sasti = false;
    D.hedef = null; D.atesle = false;
  }
  function atesEt(){ if(!D.mermi && D.vurulan < 0) D.mermi = {x:D.sx, y:PY - 2}; }

  /* ziyaretçi oynadığında sahne 4 saniye boyunca kendini geri çeker */
  ekran.addEventListener('click', function(e){
    var r = ekran.getBoundingClientRect();
    var mx = (e.clientX - r.left) * W / r.width;
    var en = D.cols[0];
    D.cols.forEach(function(c){ if(Math.abs(c.x - mx) < Math.abs(en.x - mx)) en = c; });
    D.el = D.t; D.hedef = en.x; D.atesle = true;
    try { ekran.focus({preventScroll:true}); } catch(err){ ekran.focus(); }
  });
  ekran.addEventListener('keydown', function(e){
    var k = e.key;
    if(k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== ' ' && k !== 'Spacebar') return;
    /* kapağı açan ve sayfa çeviren tuşlar oyun odaklıyken sayfaya gitmesin */
    e.preventDefault(); e.stopPropagation();
    D.el = D.t;
    if(k === 'ArrowLeft'){ D.hedef = null; D.sx = Math.max(20, D.sx - 16); }
    else if(k === 'ArrowRight'){ D.hedef = null; D.sx = Math.min(W - 20, D.sx + 16); }
    else atesEt();
  });

  function adim(){
    D.t++;
    var kendi = D.t - D.el > 240;
    if(D.vurulan < 0){
      D.y += (dar ? 0.22 : 0.16) + (D.sev - 1) * 0.035;
      if(kendi){
        var dk = -1;
        D.cols.forEach(function(c, k){ if(c.t === D.ad[1]) dk = k; });
        var hedef = D.cols[dk];
        if(D.sasir && !D.sasti){ hedef = D.cols[(dk + 1 + Math.floor(Math.random() * 2)) % 3]; D.sasti = 'hedefte'; D.sasHedef = hedef; }
        if(D.sasti === 'hedefte') hedef = D.sasHedef;
        D.sx += (hedef.x - D.sx) * 0.09;
        if(Math.abs(D.sx - hedef.x) < 2 && D.y > Y0 + 8) atesEt();
      } else if(D.hedef !== null){
        D.sx += (D.hedef - D.sx) * 0.25;
        if(D.atesle && Math.abs(D.sx - D.hedef) < 2){ atesEt(); D.atesle = false; }
      }
      if(D.mermi){
        D.mermi.y -= 6;
        if(D.mermi.y < D.y + 20){
          var vur = null;
          D.cols.forEach(function(c){ if(Math.abs(D.mermi.x - c.x) < BG / 2) vur = c; });
          if(vur){
            if(vur.t === D.ad[1]){
              D.vurulan = D.cols.indexOf(vur); D.bekle = 0;
              D.puan += 10 * D.sev; D.dogru++;
              bip(880, 0.08); setTimeout(function(){ bip(1320, 0.1); }, 90);
              if(D.dogru % 5 === 0 && D.sev < 4){ D.sev++; D.sevYazi = 110; }
            } else {
              vur.sars = 20; D.sasti = true;
              D.not = {t:'nein!', x:vur.x, y:D.y - 6, k:45};
              bip(160, 0.18);
            }
            D.mermi = null;
          } else if(D.mermi.y < 0) D.mermi = null;
        }
      }
      if(D.y > PY - 30) yeniTur();
    } else {
      D.bekle++;
      if(D.bekle > 75) yeniTur();
    }
    ciz(kendi);
  }

  function yaz(s, X, Y, renk, boy, hiza){
    x.fillStyle = renk;
    x.font = '500 ' + boy + 'px ' + YAZI;
    x.textAlign = hiza || 'left';
    x.textBaseline = 'middle';
    x.fillText(s, X, Y);
  }
  function piksel(m, X, Y, p, renk){
    for(var r = 0; r < m.length; r++) for(var k = 0; k < m[r].length; k++){
      var ch = m[r].charAt(k);
      if(ch !== '.'){ x.fillStyle = renk[ch]; x.fillRect(X + k * p, Y + r * p, p, p); }
    }
  }

  function ciz(kendi){
    x.fillStyle = ZEMIN; x.fillRect(0, 0, W, H);
    yaz((dar ? 'LV ' : 'LEVEL ') + D.sev, 12, 11, SOLUK, 10);
    yaz((dar ? '' : 'PUAN ') + ('00000' + D.puan).slice(-5), W - 12, 11, KREM, 11, 'right');

    var bitti = D.vurulan >= 0;
    var soz = (bitti ? D.ad[1] : '_____') + ' ' + D.ad[0];
    x.font = '500 13px ' + YAZI;
    var sg = x.measureText(soz).width;
    if(dar){
      yaz(soz, W / 2, 11, KREM, 13, 'center');
      yaz(D.ad[2], W / 2, 27, SOLUK, 10, 'center');
      if(bitti){ x.fillStyle = KREM; x.fillRect(W / 2 - sg / 2, 20, sg, 1.5); }
    } else {
      var orta = W / 2 - 14;
      yaz(soz, orta, 11, KREM, 13, 'center');
      yaz('· ' + D.ad[2], orta + sg / 2 + 8, 11, SOLUK, 10);
      if(bitti){ x.fillStyle = KREM; x.fillRect(orta - sg / 2, 20, sg, 1.5); }
    }

    D.cols.forEach(function(c, k){
      var oy = 0;
      if(c.sars > 0){ oy = Math.sin(c.sars * 1.3) * 4; c.sars--; }
      var bu = bitti && D.vurulan === k;
      if(bu){
        x.strokeStyle = KREM; x.lineWidth = 2;
        x.strokeRect(c.x - BG / 2 + 1, D.y + 1, BG - 2, 18);
        yaz(c.t, c.x, D.y + 10, KREM, 12, 'center');
        yaz('+' + (10 * D.sev), c.x + BG / 2 + 6, D.y + 10 - D.bekle * 0.2, KREM, 10);
      } else {
        x.fillStyle = bitti ? SONUK : KREM;
        x.fillRect(c.x - BG / 2 + oy, D.y, BG, 20);
        x.fillStyle = 'rgba(0,0,0,.22)';
        x.fillRect(c.x - BG / 2 + oy, D.y + 17, BG, 3);
        yaz(c.t, c.x + oy, D.y + 9, bitti ? SOLUK : ZEMIN, 12, 'center');
      }
    });

    if(D.not && D.not.k > 0){
      D.not.k--;
      yaz(D.not.t, D.not.x, D.not.y - (45 - D.not.k) * 0.2, D.not.k > 20 ? KREM : SOLUK, 10, 'center');
    }
    if(D.mermi){ x.fillStyle = KREM; x.fillRect(D.mermi.x - 1, D.mermi.y, 3, 7); }

    x.fillStyle = CIZGI; x.fillRect(0, H - 4, W, 2);
    piksel(KALEM, D.sx - 10, PY, 3, KALEM_RENK);
    if(!kendi) yaz(dar ? 'SEN' : 'SEN OYNUYORSUN', 12, H - 12, SOLUK, 9);
    else yaz(dar ? 'DOKUN' : 'DOKUN · ← → BOŞLUK', W - 12, H - 12, '#3f6f70', 9, 'right');

    if(D.sevYazi > 0){
      D.sevYazi--;
      if((D.sevYazi >> 3) % 2) yaz(dar ? 'LEVEL ' + D.sev : 'LEVEL ' + D.sev + ' · daha seyrek sözcükler', W / 2, PY - 12, KREM, 12, 'center');
    }

    /* eski ekran tarama çizgileri */
    x.fillStyle = 'rgba(0,0,0,.22)';
    for(var y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
  }

  /* döngü yalnızca sahne görünürken döner */
  var calisiyor = false, gorunur = true;
  function dongu(){
    if(!calisiyor) return;
    adim();
    if(azHareket){ calisiyor = false; return; }
    requestAnimationFrame(dongu);
  }
  function basla(){
    if(calisiyor || !gorunur || document.hidden) return;
    calisiyor = true;
    requestAnimationFrame(dongu);
  }
  function dur(){ calisiyor = false; }

  olcule();
  yeniTur();
  ciz(true);

  if(azHareket){
    /* durağan kare: yazı tipi yüklenince bir kez daha çizilir */
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ ciz(true); });
  } else {
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(g){
        gorunur = g[0].isIntersecting;
        if(gorunur) basla(); else dur();
      }).observe(ekran);
    }
    document.addEventListener('visibilitychange', function(){ if(document.hidden) dur(); else basla(); });
    basla();
  }

  var olcuSaati = null;
  window.addEventListener('resize', function(){
    clearTimeout(olcuSaati);
    olcuSaati = setTimeout(function(){ olcule(); ciz(true); }, 120);
  });
})();
