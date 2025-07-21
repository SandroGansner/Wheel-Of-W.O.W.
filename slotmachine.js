// === Limits, Zähler & Session-Regel ===
const limits = {
  bike: 100,   // Maximal 100 Bike-Merch
  socks: 100,  // Maximal 100 Socken
  nino: 100    // Maximal 100 Hauptpreis Nino
};
let count = {
  bike: 0,
  socks: 0,
  nino: 0
};
let sessionHasPrize = false; // Max. 1 Gewinn pro Session

const qrCodes = {
  nino: "https://dein-nino-hauptpreis-formular-url.com",
  bk: "https://dein-lostopf-formular-url.com"
};

const symbols = [
  {key: 'bike',   label: "🚲", img: 'bike.png', weight: 5,  limit: 'bike'},
  {key: 'socks',  label: "🧦", img: 'socks.png', weight: 5, limit: 'socks'},
  {key: 'nino',   label: "🏆", img: 'nino.png', weight: 5,  limit: 'nino'},
  {key: 'bk',     label: "👑", img: 'bk.png',   weight: 37}, // Lead (kein Limit!), PNG mit transparentem Hintergrund!
  {key: 'none',   label: "🙃", img: null, weight: 38}
];

const maxSpins = 3;
let spinsLeft = maxSpins;

const reels = [
  document.getElementById("reel1"),
  document.getElementById("reel2"),
  document.getElementById("reel3")
];
const btn = document.getElementById("spin-btn");
const spinCounter = document.getElementById("spin-counter");
const resultDiv = document.getElementById("result");
const confettiCanvas = document.getElementById("confetti");
const statsDiv = document.getElementById("stats-counter");

// Hilfsfunktion für QR-Code (nutzt Google Chart API)
function getQRCodeImg(url, size = 180) {
  return `<div style="margin:16px 0 8px 0;display:flex;flex-direction:column;align-items:center;">
    <img src="https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(url)}&chld=L|1" width="${size}" height="${size}" alt="QR Code" style="background:#fff;border-radius:16px;padding:8px;box-shadow:0 2px 14px #0004"/>
    <span style="color:#fff;text-shadow:0 1px 8px #000a;font-weight:600;font-size:1.02em;display:block;text-align:center;margin-top:0.5em;">Jetzt mit dem Handy scannen<br>und direkt eintragen!</span>
  </div>`;
}

function updateSpinCounter() {
  if (spinsLeft > 0) {
    spinCounter.innerHTML = `🎰 Du hast <b>${spinsLeft}</b> von <b>${maxSpins}</b> Versuchen!`;
  } else {
    spinCounter.innerHTML = `<span style="color:#FF1930;font-weight:bold;">Keine Versuche mehr!<br>Bitte nächsten Spieler drücken lassen!</span>`;
  }
  updateStatsCounter();
}
function updateStatsCounter() {
  statsDiv.innerHTML =
    `<span class="stat-item stat-socks">🧦 Socken: <b>${count.socks}</b> / ${limits.socks}</span>
     <span class="stat-item stat-bike">🚲 Bike-Merch: <b>${count.bike}</b> / ${limits.bike}</span>`;
}

// Filtert alle Preise, die noch verfügbar sind
function getAvailableSymbols() {
  return symbols.filter(s => {
    if (!s.limit) return true; // Kein Limit
    return count[s.limit] < limits[s.limit];
  });
}

// Weighted Random Symbol aus verfügbaren Symbolen
function weightedRandomSymbol() {
  let available = getAvailableSymbols();
  const sum = available.reduce((a, b) => a + b.weight, 0);
  let rand = Math.random() * sum;
  for (const s of available) {
    if (rand < s.weight) return s;
    rand -= s.weight;
  }
  return available[available.length-1];
}

// Gibt ein 3er-Gewinn-Array zurück
function getWinCombo() {
  if (sessionHasPrize) return Array(3).fill(symbols.find(s=>s.key==='none'));
  let comboTable = [];
  if (count.nino < limits.nino) comboTable.push({key:'nino', chance:0.10});
  comboTable.push({key:'bk', chance:0.37});
  if (count.bike < limits.bike) comboTable.push({key:'bike', chance:0.10});
  if (count.socks < limits.socks) comboTable.push({key:'socks', chance:0.10});
  comboTable.push({key:'none', chance:0.33});
  let norm = comboTable.reduce((a,b)=>a+b.chance,0);
  comboTable.forEach(c => c.chance /= norm);
  let r = Math.random(), acc=0;
  for (const c of comboTable) {
    acc += c.chance;
    if (r < acc) {
      let sym = symbols.find(s=>s.key===c.key);
      return Array(3).fill(sym);
    }
  }
  return Array(3).fill(symbols.find(s=>s.key==='none'));
}

function getPrizeKey(symbolsArr) {
  const key = symbolsArr[0].key;
  if (symbolsArr.every(s=>s.key===key)) {
    if (['bike','socks','nino'].includes(key) && count[key] >= limits[key]) return 'none';
    return key;
  }
  return 'none';
}

const resultTexts = {
  nino:   "🏆 HAUPTPREIS! Übernachtung im Revier Hotel + Bikepark für 2! <br><b>Herzlichen Glückwunsch! 🎉</b>",
  socks:     "🧦 Du hast Socken gewonnen! Viel Spaß!",
  bike:      "🚲 Du gewinnst einen coolen Bike-Anhänger oder eine Cap!",
  bk:      "👑 Teilnahme am Lostopf! Gib deine E-Mail für die grosse Verlosung ein.",
  none:      "🙃 Leider kein Gewinn. Versuch's nochmal!"
};

let spinning = false;

btn.addEventListener('click', async () => {
  if (spinning || spinsLeft <= 0) return;
  spinning = true;
  btn.disabled = true;
  resultDiv.innerHTML = "&nbsp;";
  spinsLeft--;
  updateSpinCounter();

  try {
    let finalSymbols = getWinCombo();
    let strips = finalSymbols.map(s=>{
      let strip = [];
      let avail = getAvailableSymbols();
      for(let i=0;i<9;i++) strip.push(avail[Math.floor(Math.random()*avail.length)]);
      strip.push(s);
      return strip;
    });

    await Promise.all([
      animateReel(reels[0], strips[0], 9, 1100+Math.random()*280),
      animateReel(reels[1], strips[1], 9, 1450+Math.random()*330),
      animateReel(reels[2], strips[2], 9, 1800+Math.random()*380)
    ]);

    const prizeKey = getPrizeKey(finalSymbols);
    if(['bike','socks','nino'].includes(prizeKey)) {
      count[prizeKey]++;
      sessionHasPrize = true;
    }
    if(prizeKey === 'bk') sessionHasPrize = true;
    if (prizeKey==='nino') fireConfetti();

    // Ergebnistext und ggf. QR-Code anzeigen
    let resultHtml = resultTexts[prizeKey];
    if (prizeKey === "bk" && qrCodes.bk) {
      resultHtml += getQRCodeImg(qrCodes.bk);
    }
    if (prizeKey === "nino" && qrCodes.nino) {
      resultHtml += getQRCodeImg(qrCodes.nino);
    }
    resultDiv.innerHTML = resultHtml;

    updateStatsCounter();

    if (spinsLeft <= 0) {
      btn.disabled = true;
      setTimeout(() => {
        spinsLeft = maxSpins;
        sessionHasPrize = false;
        updateSpinCounter();
        resultDiv.innerHTML = "";
        btn.disabled = false;
        showRandom();
      }, 3500);
    } else {
      btn.disabled = false;
    }
  } catch (err) {
    spinning = false;
    btn.disabled = false;
    resultDiv.innerHTML = "<span style='color:red'>Fehler beim Drehen! Bitte Seite neu laden.</span>";
    console.error('Fehler im Spin:', err);
    return;
  }
  spinning = false;
});

function animateReel(reel, symbols, stopIdx, duration=1200) {
  reel.classList.add('spin');
  reel.innerHTML = "";
  let t0 = performance.now();
  let last = -1;
  return new Promise(resolve => {
    function frame(now) {
      let elapsed = now-t0;
      let progress = Math.min(elapsed/duration,1);
      let flashes = Math.floor(progress*16);
      let idx = Math.floor(Math.random()*symbols.length);
      if (progress > 0.8) idx = stopIdx;
      if (idx!==last) {
        let s = symbols[idx];
        if(s.img) {
          // PNGs mit transparentem Hintergrund optimal anzeigen!
          reel.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;"><img src="${s.img}" alt="${s.label}" style="width:88%;height:88%;display:block;margin:0 auto;background:transparent;"></div>`;
        } else {
          reel.innerHTML = `<span style="font-size:2.6em;display:flex;align-items:center;justify-content:center;height:100%;">${s.label}</span>`;
        }
        if (flashes%2===0 && progress<0.8) {
          reel.style.filter = 'brightness(2.5) drop-shadow(0 0 22px #ff0)';
          reel.style.borderColor = '#fff000';
          reel.style.boxShadow = '0 0 48px #FFD700, 0 0 90px #FF1930';
        } else {
          reel.style.filter = '';
          reel.style.borderColor = '#FFD700';
          reel.style.boxShadow = '0 0 30px #FFD70099, 0 0 64px #FF193077';
        }
        last = idx;
      }
      if (progress<1) requestAnimationFrame(frame);
      else {
        reel.classList.remove('spin');
        reel.classList.add('shake');
        reel.style.filter = '';
        reel.style.borderColor = '#FFD700';
        reel.style.boxShadow = '0 0 30px #FFD70099, 0 0 64px #FF193077';
        setTimeout(()=>{ reel.classList.remove('shake'); resolve(); },400);
      }
    }
    requestAnimationFrame(frame);
  });
}

function showRandom() {
  let avail = getAvailableSymbols();
  reels.forEach(r=>{
    let s = avail[Math.floor(Math.random()*avail.length)];
    if(s.img) {
      r.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;"><img src="${s.img}" alt="${s.label}" style="width:88%;height:88%;display:block;margin:0 auto;background:transparent;"></div>`;
    } else {
      r.innerHTML = `<span style="font-size:2.6em;display:flex;align-items:center;justify-content:center;height:100%;">${s.label}</span>`;
    }
  });
}
showRandom();
updateSpinCounter();

function fireConfetti() {
  confettiCanvas.style.display = "block";
  const ctx = confettiCanvas.getContext('2d');
  const W = window.innerWidth, H = window.innerHeight;
  confettiCanvas.width = W; confettiCanvas.height = H;
  let particles = [];
  for(let i=0;i<120;i++) {
    particles.push({
      x:Math.random()*W, y:Math.random()*-H/3,
      r:8+Math.random()*10, d:Math.random()*W/2,
      color:`hsl(${Math.random()*360},90%,65%)`,
      tilt:Math.random()*10-5,
      tiltAngle:0,
      tiltAngleInc:0.05+Math.random()*0.07,
      speed:2+Math.random()*3
    });
  }
  let t = 0;
  function draw() {
    ctx.clearRect(0,0,W,H);
    for(let p of particles) {
      ctx.beginPath();
      ctx.ellipse(p.x+p.tilt,p.y,p.r*0.6,p.r,0,0,2*Math.PI);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  }
  function update() {
    t++;
    for(let p of particles) {
      p.tiltAngle += p.tiltAngleInc;
      p.tilt = Math.sin(p.tiltAngle)*12;
      p.y += p.speed;
      p.x += Math.sin(t/20+p.d)*1.2;
      if(p.y>H+20) p.y = Math.random()*-60;
    }
  }
  let frames = 0;
  function loop() {
    draw(); update();
    frames++;
    if(frames<100) requestAnimationFrame(loop);
    else confettiCanvas.style.display = "none";
  }
  loop();
}