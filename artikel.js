/* ===== RETRO ARTİKEL AVCISI =====
   Kapaktaki küçük oyun, eski salon oyunlarının akışıyla çalışır:
   başlık ekranı ve kayan yazı, ardından birkaç demo turu, sonra yine
   başlık. Ziyaretçi dokununca (ya da boşluk / Enter) 3-2-1 sayılır ve
   oyun başlar. Ekranın üstünde bir Almanca ad belirir, der, die, das
   blokları iner; kalem doğru artikeli vurmalıdır. Vurulmayan bloklar
   kaleme değerse kalem patlar, "Oyun bitti" ekranı gelir ve başa dönülür.
   Her beş doğruda seviye artar, sözcükler sıklık bandında yukarı çıkar.
   Ses ve müzik varsayılan olarak kapalıdır; tarayıcılar dokunmadan ses
   çalınmasına zaten izin vermez. Hareket kısıtlıysa durağan başlık çizilir. */
(function(){
  var ekran = document.getElementById('artikel');
  if(!ekran || !ekran.getContext) return;
  var x = ekran.getContext('2d');
  var sesDug = document.getElementById('oyun-ses');
  var azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ZEMIN = '#07262A', KREM = '#F3E9D2', SOLUK = '#5f8a8a', SONUK = '#1d4a4f', CIZGI = '#0d3a40', OKER = '#C08A2E';
  var YAZI = '"IBM Plex Mono", ui-monospace, monospace';
  var BASLIK = 'RETRO ARTİKEL AVCISI';
  var KAYAN = 'HOŞ GELDİNİZ  ·  ADI OKU, DOĞRU ARTİKELİ VUR  ·  BLOKLAR KALEME DEĞMESİN  ·  HER 5 DOĞRUDA SEVİYE ATLA, SÖZCÜKLER SEYREKLEŞİR  ·  1 OYUNCU  ·  © 2026 BBASARAN  ·  ';

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

  /* ---------- ölçüler ---------- */
  var W = 640, H = 140, dar = false, Y0 = 26, PY = 88, BG = 64, XS = [150, 320, 490], OLCEK = 3;
  var G = {sev:1, dogru:0, puan:0, y:26, cols:null, sx:320, mermi:null, vurulan:-1, bekle:0, ad:null,
           not:null, sevYazi:0, sasir:false, sasti:false, sasHedef:null, hedef:null, atesle:false};

  function olcule(){
    var g = Math.round(ekran.clientWidth || ekran.parentNode.clientWidth || 640);
    W = Math.max(280, g);
    dar = W < 520;
    H = 140;
    Y0 = dar ? 40 : 26;
    PY = H - 24;
    BG = Math.min(64, Math.round(W * 0.2));
    XS = [Math.round(W * 0.23), Math.round(W * 0.5), Math.round(W * 0.77)];
    OLCEK = W >= 600 ? 3 : 2;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    ekran.style.height = H + 'px';
    ekran.width = Math.round(W * dpr);
    ekran.height = Math.round(H * dpr);
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    if(G.cols) G.cols.forEach(function(c, k){ c.x = XS[k]; });
    G.sx = Math.min(Math.max(G.sx, 20), W - 20);
  }

  /* piksel başlık: küçük yazılıp büyütülür, böylece kenarları kırık görünür */
  var ara = document.createElement('canvas');
  ara.width = 220; ara.height = 14;
  var ax = ara.getContext('2d');
  var baslikGen = 120;
  function baslikHazirla(){
    ax.clearRect(0, 0, 220, 14);
    ax.font = '700 11px ' + YAZI;
    ax.textAlign = 'center'; ax.textBaseline = 'middle';
    ax.fillStyle = KREM;
    ax.fillText(BASLIK, 110, 7.5);
    baslikGen = Math.min(218, Math.ceil(ax.measureText(BASLIK).width) + 2);
  }

  /* ---------- ses ---------- */
  var ses = false, ac = null, muzikSaati = null, muzikAdim = 0;
  var MELODI = [76,0,79,0,81,81,79,76, 74,0,76,79,76,0,0,0, 72,0,76,0,79,79,76,72, 74,0,0,72,74,0,0,0];
  var BAS = [45, 43, 41, 43];
  var ADIM = 60 / 140 / 4;
  function frekans(m){ return 440 * Math.pow(2, (m - 69) / 12); }
  function sesBagla(){
    try{
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if(ac.state === 'suspended') ac.resume();
    }catch(e){ ac = null; }
  }
  function nota(m, sure, tip, guc, t0){
    if(!ses || !ac || !m) return;
    try{
      var t = t0 || ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = tip; o.frequency.value = frekans(m);
      g.gain.setValueAtTime(guc, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + sure + 0.02);
    }catch(e){}
  }
  function bip(f, s){
    if(!ses || !ac) return;
    try{
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = f; g.gain.value = 0.03;
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + s);
    }catch(e){}
  }
  function muzikBasla(){
    if(!ses || !ac || muzikSaati) return;
    muzikAdim = 0;
    muzikSaati = setInterval(function(){
      var i = muzikAdim % 32;
      nota(MELODI[i], ADIM * 1.6, 'square', 0.028);
      if(i % 4 === 0) nota(BAS[Math.floor(i / 8) % 4], ADIM * 3.6, 'triangle', 0.06);
      muzikAdim++;
    }, ADIM * 1000);
  }
  function muzikDur(){ clearInterval(muzikSaati); muzikSaati = null; }
  function cingil(){
    if(!ses || !ac) return;
    [72, 76, 79, 84].forEach(function(m, i){ nota(m, 0.14, 'square', 0.035, ac.currentTime + i * 0.09); });
  }
  /* patlama: süzgeçten geçen gürültü ve aşağı inen bir uğultu */
  function patlamaSesi(){
    if(!ses || !ac) return;
    try{
      var t = ac.currentTime, uzun = 0.9;
      var tampon = ac.createBuffer(1, Math.floor(ac.sampleRate * uzun), ac.sampleRate);
      var veri = tampon.getChannelData(0);
      for(var i = 0; i < veri.length; i++) veri[i] = Math.random() * 2 - 1;
      var kaynak = ac.createBufferSource(); kaynak.buffer = tampon;
      var suzgec = ac.createBiquadFilter(); suzgec.type = 'lowpass';
      suzgec.frequency.setValueAtTime(2400, t);
      suzgec.frequency.exponentialRampToValueAtTime(120, t + uzun);
      var g = ac.createGain();
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + uzun);
      kaynak.connect(suzgec); suzgec.connect(g); g.connect(ac.destination);
      kaynak.start(t); kaynak.stop(t + uzun);
      var o = ac.createOscillator(), og = ac.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(320, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.7);
      og.gain.setValueAtTime(0.05, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(og); og.connect(ac.destination);
      o.start(t); o.stop(t + 0.72);
      [0.08, 0.2, 0.34].forEach(function(d){
        var c = ac.createOscillator(), cg = ac.createGain();
        c.type = 'square'; c.frequency.value = 90 + Math.random() * 60;
        cg.gain.setValueAtTime(0.06, t + d);
        cg.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.08);
        c.connect(cg); cg.connect(ac.destination);
        c.start(t + d); c.stop(t + d + 0.1);
      });
    }catch(e){}
  }
  if(sesDug){
    sesDug.addEventListener('click', function(){
      ses = !ses;
      sesDug.textContent = ses ? 'Ses açık' : 'Ses kapalı';
      sesDug.setAttribute('aria-pressed', ses ? 'true' : 'false');
      if(ses){ sesBagla(); if(durum === 'baslik') muzikBasla(); }
      else muzikDur();
    });
  }

  /* ---------- en iyi puan: yalnızca bu tarayıcıda tutulur ---------- */
  var eniyi = 0;
  try { eniyi = parseInt(localStorage.getItem('artikel-eniyi'), 10) || 0; } catch(e){}
  function eniyiKaydet(){
    if(G.puan > eniyi){
      eniyi = G.puan;
      try { localStorage.setItem('artikel-eniyi', String(eniyi)); } catch(e){}
      return true;
    }
    return false;
  }

  /* ---------- oyun ---------- */
  var durum = 'baslik', st = 0, demoTur = 0, rekor = false, kirik = [];

  function sec(){
    var havuz = SOZLUK.filter(function(n){ return n[3] <= G.sev; });
    if(Math.random() < 0.6){
      var bu = havuz.filter(function(n){ return n[3] === G.sev; });
      if(bu.length) havuz = bu;
    }
    var n;
    do { n = havuz[Math.floor(Math.random() * havuz.length)]; } while(havuz.length > 1 && n === G.ad);
    return n;
  }
  function karistir(a){
    for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function yeniTur(){
    G.ad = sec();
    G.cols = karistir(['der','die','das']).map(function(t, k){ return {t:t, x:XS[k], sars:0}; });
    G.y = Y0; G.vurulan = -1; G.mermi = null;
    G.sasir = durum === 'demo' && Math.random() < 0.25; G.sasti = false;
    G.hedef = null; G.atesle = false;
  }
  function sifirla(){ G.sev = 1; G.dogru = 0; G.puan = 0; G.sx = W / 2; G.sevYazi = 0; G.not = null; yeniTur(); }

  function gec(d){
    durum = d; st = 0;
    if(d === 'baslik') muzikBasla(); else muzikDur();
    if(d === 'demo'){ demoTur = 0; sifirla(); }
    if(d === 'sayim') cingil();
    if(d === 'oyun') sifirla();
    if(d === 'patlama'){ patlamaKur(); patlamaSesi(); }
    if(d === 'bitti') rekor = eniyiKaydet();
  }
  function atesEt(){ if(!G.mermi && G.vurulan < 0) G.mermi = {x:G.sx, y:PY - 2}; }
  function baslat(){ sesBagla(); gec('sayim'); }

  ekran.addEventListener('click', function(e){
    try { ekran.focus({preventScroll:true}); } catch(err){ ekran.focus(); }
    if(durum === 'baslik' || durum === 'demo' || durum === 'bitti'){ baslat(); return; }
    if(durum !== 'oyun') return;
    var r = ekran.getBoundingClientRect();
    var mx = (e.clientX - r.left) * W / r.width;
    var en = G.cols[0];
    G.cols.forEach(function(c){ if(Math.abs(c.x - mx) < Math.abs(en.x - mx)) en = c; });
    G.hedef = en.x; G.atesle = true;
  });
  ekran.addEventListener('keydown', function(e){
    var k = e.key;
    var bizim = k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ' || k === 'Spacebar' || k === 'Enter';
    if(!bizim) return;
    /* kapağı açan ve sayfa çeviren tuşlar oyun odaklıyken sayfaya gitmesin */
    e.preventDefault(); e.stopPropagation();
    if(durum === 'baslik' || durum === 'demo' || durum === 'bitti'){
      if(k !== 'ArrowLeft' && k !== 'ArrowRight') baslat();
      return;
    }
    if(durum !== 'oyun') return;
    if(k === 'ArrowLeft'){ G.hedef = null; G.sx = Math.max(20, G.sx - 16); }
    else if(k === 'ArrowRight'){ G.hedef = null; G.sx = Math.min(W - 20, G.sx + 16); }
    else atesEt();
  });

  /* bir adım: tur bitince 'tur', blok kaleme değince 'carpti' döner */
  function oyunAdim(oto){
    if(G.vurulan < 0){
      G.y += (dar ? 0.22 : 0.16) + (G.sev - 1) * 0.035;
      if(oto){
        var dk = 0;
        G.cols.forEach(function(c, k){ if(c.t === G.ad[1]) dk = k; });
        var hedef = G.cols[dk];
        if(G.sasir && !G.sasti){ G.sasHedef = G.cols[(dk + 1 + Math.floor(Math.random() * 2)) % 3]; G.sasti = 'hedefte'; }
        if(G.sasti === 'hedefte') hedef = G.sasHedef;
        G.sx += (hedef.x - G.sx) * 0.09;
        if(Math.abs(G.sx - hedef.x) < 2 && G.y > Y0 + 8) atesEt();
      } else if(G.hedef !== null){
        G.sx += (G.hedef - G.sx) * 0.25;
        if(G.atesle && Math.abs(G.sx - G.hedef) < 2){ atesEt(); G.atesle = false; }
      }
      if(G.mermi){
        G.mermi.y -= 6;
        if(G.mermi.y < G.y + 20){
          var vur = null;
          G.cols.forEach(function(c){ if(Math.abs(G.mermi.x - c.x) < BG / 2) vur = c; });
          if(vur){
            if(vur.t === G.ad[1]){
              G.vurulan = G.cols.indexOf(vur); G.bekle = 0;
              G.puan += 10 * G.sev; G.dogru++;
              bip(880, 0.07); setTimeout(function(){ bip(1320, 0.09); }, 80);
              if(G.dogru % 5 === 0 && G.sev < 4){ G.sev++; G.sevYazi = 110; }
            } else {
              vur.sars = 20; G.sasti = true;
              G.not = {t:'nein!', x:vur.x, y:G.y - 6, k:45};
              bip(160, 0.16);
            }
            G.mermi = null;
          } else if(G.mermi.y < 0) G.mermi = null;
        }
      }
      if(oto){ if(G.y > PY - 30){ yeniTur(); return 'tur'; } }
      else if(G.y + 20 >= PY + 2) return 'carpti';
    } else {
      G.bekle++;
      if(G.bekle > 70){ yeniTur(); return 'tur'; }
    }
    return '';
  }

  function patlamaKur(){
    kirik = [];
    var kaynaklar = [{x:G.sx, y:PY + 10, n:26}];
    G.cols.forEach(function(c){ kaynaklar.push({x:c.x, y:G.y + 10, n:10}); });
    kaynaklar.forEach(function(k){
      for(var i = 0; i < k.n; i++){
        var a = Math.random() * Math.PI * 2, h = 0.6 + Math.random() * 2.6;
        kirik.push({x:k.x, y:k.y, vx:Math.cos(a) * h, vy:Math.sin(a) * h - 1, o:2 + Math.floor(Math.random() * 3),
                    r:Math.random() < 0.5 ? KREM : (Math.random() < 0.5 ? OKER : SOLUK), om:40 + Math.random() * 40});
      }
    });
  }

  /* ---------- çizim ---------- */
  function yaz(s, X, Y, renk, boy, hiza, kalin){
    x.fillStyle = renk;
    x.font = (kalin || 500) + ' ' + boy + 'px ' + YAZI;
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
  function zemin(){ x.fillStyle = ZEMIN; x.fillRect(0, 0, W, H); }
  function tara(){
    x.fillStyle = 'rgba(0,0,0,.22)';
    for(var y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
  }
  function puanYazi(n){ return ('00000' + n).slice(-5); }

  function baslikCiz(){
    zemin();
    var s = OLCEK, bh = 14 * s, bw = baslikGen * s;
    var son = dar ? 10 : 6;
    var t = Math.min(1, st / 40), yumus = 1 - Math.pow(1 - t, 3);
    var by = -bh + yumus * (bh + son);
    x.imageSmoothingEnabled = false;
    x.drawImage(ara, 110 - baslikGen / 2, 0, baslikGen, 14, Math.round(W / 2 - bw / 2), Math.round(by), bw, bh);
    if(st > 40 && st < 72){
      var p = (st - 40) / 32 * (bw + 40) - 20;
      x.save(); x.beginPath(); x.rect(W / 2 - bw / 2, by, bw, bh); x.clip();
      x.fillStyle = 'rgba(243,233,210,.22)'; x.fillRect(W / 2 - bw / 2 + p, by, 14, bh);
      x.restore();
    }
    if(W - bw > 120){
      var oy = Math.sin(st / 10) * 2;
      piksel(KALEM, W / 2 - bw / 2 - 34, by + bh / 2 - 10 + oy, 3, KALEM_RENK);
      piksel(KALEM, W / 2 + bw / 2 + 13, by + bh / 2 - 10 - oy, 3, KALEM_RENK);
    }
    var alt = son + bh;
    if(st > 46) yaz('EN İYİ  ' + puanYazi(eniyi), W / 2, alt + 9, SOLUK, 10, 'center');
    if(st > 58 && (st >> 4) % 2) yaz(dar ? 'DOKUN VE BAŞLA' : 'BAŞLAMAK İÇİN DOKUN', W / 2, alt + 26, KREM, 12, 'center', 700);
    var cy = H - 20;
    x.fillStyle = CIZGI; x.fillRect(0, cy, W, 1);
    x.save(); x.beginPath(); x.rect(0, cy + 1, W, H - cy - 1); x.clip();
    x.font = '500 10px ' + YAZI;
    var kg = x.measureText(KAYAN).width;
    var kx = W - ((st * 1.1) % (kg + W));
    yaz(KAYAN + KAYAN, kx, cy + 10, OKER, 10);
    x.restore();
  }

  function oyunCiz(etiket){
    zemin();
    yaz((dar ? 'LV ' : 'LEVEL ') + G.sev, 12, 11, SOLUK, 10);
    yaz((dar ? '' : 'PUAN ') + puanYazi(G.puan), W - 12, 11, KREM, 11, 'right');
    var bitti = G.vurulan >= 0;
    var soz = (bitti ? G.ad[1] : '_____') + ' ' + G.ad[0];
    x.font = '500 13px ' + YAZI;
    var sg = x.measureText(soz).width;
    if(dar){
      yaz(soz, W / 2, 11, KREM, 13, 'center');
      yaz(G.ad[2], W / 2, 27, SOLUK, 10, 'center');
      if(bitti){ x.fillStyle = KREM; x.fillRect(W / 2 - sg / 2, 20, sg, 1.5); }
    } else {
      var orta = W / 2 - 14;
      yaz(soz, orta, 11, KREM, 13, 'center');
      yaz('· ' + G.ad[2], orta + sg / 2 + 8, 11, SOLUK, 10);
      if(bitti){ x.fillStyle = KREM; x.fillRect(orta - sg / 2, 20, sg, 1.5); }
    }
    G.cols.forEach(function(c, k){
      var oy = 0;
      if(c.sars > 0){ oy = Math.sin(c.sars * 1.3) * 4; c.sars--; }
      if(bitti && G.vurulan === k){
        x.strokeStyle = KREM; x.lineWidth = 2;
        x.strokeRect(c.x - BG / 2 + 1, G.y + 1, BG - 2, 18);
        yaz(c.t, c.x, G.y + 10, KREM, 12, 'center');
        yaz('+' + (10 * G.sev), c.x + BG / 2 + 6, G.y + 10 - G.bekle * 0.2, KREM, 10);
      } else {
        x.fillStyle = bitti ? SONUK : KREM;
        x.fillRect(c.x - BG / 2 + oy, G.y, BG, 20);
        x.fillStyle = 'rgba(0,0,0,.22)';
        x.fillRect(c.x - BG / 2 + oy, G.y + 17, BG, 3);
        yaz(c.t, c.x + oy, G.y + 9, bitti ? SOLUK : ZEMIN, 12, 'center');
      }
    });
    if(G.not && G.not.k > 0){
      G.not.k--;
      yaz(G.not.t, G.not.x, G.not.y - (45 - G.not.k) * 0.2, G.not.k > 20 ? KREM : SOLUK, 10, 'center');
    }
    if(G.mermi){ x.fillStyle = KREM; x.fillRect(G.mermi.x - 1, G.mermi.y, 3, 7); }
    x.fillStyle = CIZGI; x.fillRect(0, H - 4, W, 2);
    piksel(KALEM, G.sx - 10, PY, 3, KALEM_RENK);
    if(G.sevYazi > 0){
      G.sevYazi--;
      if((G.sevYazi >> 3) % 2) yaz(dar ? 'LEVEL ' + G.sev : 'LEVEL ' + G.sev + ' · daha seyrek sözcükler', W / 2, PY - 12, KREM, 12, 'center');
    }
    if(etiket && (st >> 4) % 2) yaz(etiket, 12, H - 12, OKER, 9, 'left', 700);
  }

  function sayimCiz(){
    zemin();
    var n = 3 - Math.floor(st / 45);
    if(n > 0){
      if(st % 45 === 0) bip(440 + (3 - n) * 90, 0.08);
      yaz(String(n), W / 2, H / 2 - 6, KREM, 30 + (st % 45) / 45 * 14, 'center', 700);
    } else yaz('BAŞLA!', W / 2, H / 2 - 6, KREM, 26, 'center', 700);
    yaz('HAZIR OL', W / 2, H - 18, SOLUK, 10, 'center');
  }

  function patlamaCiz(){
    zemin();
    var sars = st < 24 ? (Math.random() - 0.5) * (24 - st) * 0.5 : 0;
    x.save(); x.translate(sars, sars * 0.6);
    kirik.forEach(function(p){
      p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.vx *= 0.99;
      if(st < p.om){ x.fillStyle = p.r; x.fillRect(Math.round(p.x), Math.round(p.y), p.o, p.o); }
    });
    if(st < 34){
      var r = 4 + st * 2.2;
      x.strokeStyle = st < 14 ? KREM : OKER; x.lineWidth = 2;
      x.beginPath(); x.arc(G.sx, PY + 10, r, 0, Math.PI * 2); x.stroke();
    }
    x.restore();
    if(st < 5){ x.fillStyle = 'rgba(243,233,210,' + (0.5 - st * 0.1) + ')'; x.fillRect(0, 0, W, H); }
    yaz('PUAN ' + puanYazi(G.puan), W - 12, 11, KREM, 11, 'right');
  }

  function bittiCiz(){
    zemin();
    yaz('OYUN BİTTİ', W / 2, H / 2 - 18, KREM, dar ? 20 : 22, 'center', 700);
    yaz('PUAN ' + puanYazi(G.puan) + (rekor ? '  ·  YENİ REKOR' : ''), W / 2, H / 2 + 8, OKER, 11, 'center');
    if((st >> 4) % 2) yaz('TEKRAR İÇİN DOKUN', W / 2, H - 16, SOLUK, 10, 'center');
  }

  /* ---------- akış ---------- */
  function adim(){
    st++;
    if(durum === 'baslik'){ baslikCiz(); if(st > 420) gec('demo'); }
    else if(durum === 'demo'){
      var r = oyunAdim(true);
      oyunCiz(dar ? 'DEMO' : 'DEMO · BAŞLAMAK İÇİN DOKUN');
      if(r === 'tur'){ demoTur++; if(demoTur >= 4) gec('baslik'); }
    }
    else if(durum === 'sayim'){ sayimCiz(); if(st > 165) gec('oyun'); }
    else if(durum === 'oyun'){ var s = oyunAdim(false); oyunCiz(null); if(s === 'carpti') gec('patlama'); }
    else if(durum === 'patlama'){ patlamaCiz(); if(st > 110) gec('bitti'); }
    else if(durum === 'bitti'){ bittiCiz(); if(st > 260) gec('baslik'); }
    tara();
  }

  /* döngü yalnızca sahne görünürken döner; ekran tazeleme hızı ne olursa
     olsun oyun saniyede 60 adım ilerler (120 Hz ekranda iki kat hızlanmaz) */
  var calisiyor = false, gorunur = true, sonZaman = 0, birikim = 0, ADIM_MS = 1000 / 60;
  function dongu(t){
    if(!calisiyor) return;
    if(!sonZaman) sonZaman = t;
    birikim += Math.min(100, t - sonZaman);
    sonZaman = t;
    var n = 0;
    while(birikim >= ADIM_MS && n < 4){ adim(); birikim -= ADIM_MS; n++; }
    requestAnimationFrame(dongu);
  }
  function basla(){
    if(azHareket || calisiyor || !gorunur || document.hidden) return;
    calisiyor = true; sonZaman = 0; birikim = ADIM_MS;
    if(durum === 'baslik') muzikBasla();
    requestAnimationFrame(dongu);
  }
  function dur(){ calisiyor = false; muzikDur(); }

  olcule();
  baslikHazirla();
  sifirla();

  if(azHareket){
    /* durağan başlık karesi */
    var duragan = function(){ baslikHazirla(); st = 120; baslikCiz(); tara(); };
    duragan();
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(duragan);
  } else {
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(baslikHazirla);
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
    olcuSaati = setTimeout(function(){ olcule(); if(azHareket){ st = 120; baslikCiz(); tara(); } }, 120);
  });
})();
