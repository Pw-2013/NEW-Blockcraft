export class HUD {
  constructor(engine) {
    this.engine = engine;
    this.el = document.createElement('div');
    this.el.id = 'hud';
    this.el.innerHTML = `
      <div id="minimap-wrap"><canvas id="minimap" width="200" height="200"></canvas></div>
      <div id="char-tag">MARCUS</div>
      <div id="money">$5,000</div>
      <div id="wanted"></div>
      <div id="clock">08:00</div>
      <div id="health-wrap">
        <div class="bar-label">Health</div><div class="bar-bg"><div id="health-fill" class="bar-fill" style="width:100%"></div></div>
        <div class="bar-label">Armor</div><div class="bar-bg"><div id="armor-fill" class="bar-fill" style="width:0%"></div></div>
      </div>
      <div id="speedo"><div class="val">0</div><div class="unit">MPH</div></div>
      <div id="objective"></div>
      <div id="mission-toast"></div>
      <div id="location-label">Downtown</div>
    `;
    document.body.appendChild(this.el);
    this.speedo = 0;
    this.toastTimer = 0;
    this.locTimer = 0;
  }

  update(dt) {
    const e = this.engine;
    document.getElementById('money').textContent = '$' + e.money.toLocaleString();
    document.getElementById('char-tag').textContent = e.activeCharacter.toUpperCase();
    // wanted stars
    let w = '';
    for (let i = 0; i < e.wanted; i++) w += '★';
    document.getElementById('wanted').textContent = w;
    // health/armor
    document.getElementById('health-fill').style.width = Math.max(0, e.health) + '%';
    document.getElementById('armor-fill').style.width = Math.max(0, e.armor) + '%';
    // clock
    const h = Math.floor(e.gameTime / 60), mn = Math.floor(e.gameTime % 60);
    document.getElementById('clock').textContent = String(h).padStart(2,'0') + ':' + String(mn).padStart(2,'0');
    // speedo
    const so = document.getElementById('speedo');
    if (e.inVehicle) {
      so.style.opacity = 1;
      so.querySelector('.val').textContent = Math.round(Math.abs(this.speedo) * 2.237);
    } else so.style.opacity = 0;
    // location label
    this.locTimer += dt;
    if (this.locTimer > 3) {
      this.locTimer = 0;
      const pos = e.inVehicle ? e.inVehicle.group.position : e.player.group.position;
      const name = e.city.districtNameAt(pos.x, pos.z);
      const lbl = document.getElementById('location-label');
      lbl.textContent = name;
      lbl.style.opacity = 1;
      clearTimeout(this._locFade);
      this._locFade = setTimeout(() => { lbl.style.opacity = 0; }, 2600);
    }
    // toast
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) document.getElementById('mission-toast').style.opacity = 0;
    }
  }

  toast(msg) {
    const t = document.getElementById('mission-toast');
    t.textContent = msg;
    t.style.opacity = 1;
    this.toastTimer = 3.5;
  }
  objective(msg) {
    const o = document.getElementById('objective');
    o.textContent = msg;
    o.style.opacity = msg ? 1 : 0;
  }
  toggleMap() { /* full map — could expand minimap; keep simple */ }

  hide() { this.el.style.display = 'none'; }
  show() { this.el.style.display = ''; }
}
