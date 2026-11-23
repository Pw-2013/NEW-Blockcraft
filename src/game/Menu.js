import { SaveSystem } from './SaveSystem.js';

export class Menu {
  constructor(engine) {
    this.engine = engine;
    this.save = engine.save;
    this.el = document.createElement('div');
    this.el.className = 'screen';
    this.el.id = 'menu-screen';
    document.body.appendChild(this.el);
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="menu-title">GRAND CITY</div>
      <div class="menu-sub">POWER HAS A PRICE</div>
      <div class="menu-list">
        <button class="menu-btn" data-act="new">New Game</button>
        <button class="menu-btn" data-act="continue">Continue <span class="hint">Load last save</span></button>
        <button class="menu-btn" data-act="settings">Settings</button>
        <button class="menu-btn" data-act="credits">Credits</button>
        <button class="menu-btn" data-act="exit">Exit</button>
      </div>
      <div class="menu-foot">v0.1 — built with Three.js · Electron-packagable for Windows .exe</div>
    `;
    this.el.querySelectorAll('.menu-btn').forEach(b => b.addEventListener('click', () => this.onMain(b.dataset.act)));
  }

  show(kind) {
    this.el.style.display = 'flex';
    if (kind === 'pause') this.renderPause();
  }
  hide() { this.el.style.display = 'none'; }

  renderPause() {
    this.el.id = 'pause-screen';
    this.el.innerHTML = `
      <div class="pause-title">PAUSED</div>
      <div class="menu-list">
        <button class="menu-btn" data-act="resume">Resume</button>
        <button class="menu-btn" data-act="map">Map</button>
        <button class="menu-btn" data-act="missions">Missions</button>
        <button class="menu-btn" data-act="settings">Settings</button>
        <button class="menu-btn" data-act="stats">Statistics</button>
        <button class="menu-btn" data-act="save">Save Game</button>
        <button class="menu-btn" data-act="main">Main Menu</button>
      </div>
    `;
    this.el.querySelectorAll('.menu-btn').forEach(b => b.addEventListener('click', () => this.onPause(b.dataset.act)));
  }

  onMain(act) {
    if (act === 'new') this.engine.newGame();
    else if (act === 'continue') {
      const d = this.save.load();
      if (d) { this.engine.loadSaveData(d); this.engine.resume(); this.engine.hud.toast('Game loaded'); }
      else this.engine.hud.toast('No save found');
    }
    else if (act === 'settings') this.showSettings('main');
    else if (act === 'credits') this.showCredits();
    else if (act === 'exit') { this.el.innerHTML = '<div style="font-size:24px;opacity:0.6">Close the window to exit. (Packaged .exe will close here.)</div>'; }
  }

  onPause(act) {
    if (act === 'resume') this.engine.resume();
    else if (act === 'map') this.showMap();
    else if (act === 'missions') this.showMissions();
    else if (act === 'settings') this.showSettings('pause');
    else if (act === 'stats') this.showStats();
    else if (act === 'save') { this.save.save(this.engine.getSaveData()); this.engine.hud.toast('Game saved'); this.engine.resume(); }
    else if (act === 'main') { this.engine.state = 'menu'; this.render(); }
  }

  showSettings(from) {
    const s = this.engine.settings;
    this.el.innerHTML = `
      <div class="panel">
        <h2>Settings</h2>
        <div class="row"><span>Master Volume</span><input type="range" min="0" max="1" step="0.05" value="${s.master}" id="s-master"></div>
        <div class="row"><span>SFX Volume</span><input type="range" min="0" max="1" step="0.05" value="${s.sfx}" id="s-sfx"></div>
        <div class="row"><span>Music Volume</span><input type="range" min="0" max="1" step="0.05" value="${s.music}" id="s-music"></div>
        <div class="row"><span>Mouse Sensitivity</span><input type="range" min="0.3" max="2.5" step="0.1" value="${s.sensitivity}" id="s-sens"></div>
        <button class="menu-btn panel-close" id="s-back">Back</button>
      </div>`;
    document.getElementById('s-master').oninput = (e) => s.master = +e.target.value;
    document.getElementById('s-sfx').oninput = (e) => s.sfx = +e.target.value;
    document.getElementById('s-music').oninput = (e) => s.music = +e.target.value;
    document.getElementById('s-sens').oninput = (e) => s.sensitivity = +e.target.value;
    document.getElementById('s-back').onclick = () => { this.save.saveSettings(s); if (from === 'pause') this.renderPause(); else this.render(); };
  }

  showCredits() {
    this.el.innerHTML = `
      <div class="panel">
        <h2>Grand City</h2>
        <p style="opacity:0.7;line-height:1.7">An original open-world action-adventure game.<br>Protagonists: Marcus Reed & Sofia Carter.<br>City: Viceport, Solara.<br>Built with Three.js + Electron.</p>
        <button class="menu-btn panel-close" id="c-back">Back</button>
      </div>`;
    document.getElementById('c-back').onclick = () => this.render();
  }

  showMap() {
    this.el.innerHTML = `
      <div class="panel" style="max-width:700px">
        <h2>World Map — Viceport</h2>
        <canvas id="bigmap" width="640" height="640" style="width:100%;border-radius:8px;background:#222"></canvas>
        <button class="menu-btn panel-close" id="m-back">Back</button>
      </div>`;
    this.engine.minimap.drawBig(document.getElementById('bigmap'));
    document.getElementById('m-back').onclick = () => this.renderPause();
  }

  showMissions() {
    const m = this.engine.missions;
    const list = m.defs.map(d => `<div class="row"><span>Mission ${d.id} — ${d.title}</span><span class="key">${d.id === (m.current?m.current.id:10) && m.current ? 'ACTIVE' : (d.id<10?'LOCKED':(d.id<=15?'AVAILABLE':'LOCKED'))}</span></div>`).join('');
    this.el.innerHTML = `
      <div class="panel"><h2>Missions</h2>${list}<button class="menu-btn panel-close" id="mi-back">Back</button></div>`;
    document.getElementById('mi-back').onclick = () => this.renderPause();
  }

  showStats() {
    const e = this.engine;
    this.el.innerHTML = `
      <div class="panel">
        <h2>Statistics</h2>
        <div class="row"><span>Cash</span><span class="key">$${e.money.toLocaleString()}</span></div>
        <div class="row"><span>Current Mission</span><span class="key">${e.missions.current? 'Mission '+e.missions.current.id : 'None'}</span></div>
        <div class="row"><span>Active Character</span><span class="key">${e.activeCharacter}</span></div>
        <button class="menu-btn panel-close" id="st-back">Back</button>
      </div>`;
    document.getElementById('st-back').onclick = () => this.renderPause();
  }
}
