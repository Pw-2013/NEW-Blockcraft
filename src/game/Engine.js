import * as THREE from 'three';
import { Input } from './Input.js';
import { Camera } from './Camera.js';
import { City } from './City.js';
import { Player } from './Player.js';
import { Vehicle } from './Vehicle.js';
import { Traffic } from './Traffic.js';
import { Pedestrians } from './Pedestrians.js';
import { HUD } from './HUD.js';
import { Menu } from './Menu.js';
import { Minimap } from './Minimap.js';
import { Missions } from './Missions.js';
import { SaveSystem } from './SaveSystem.js';
import { GameAudio } from './Audio.js';

export class Engine {
  constructor(container) {
    this.container = container;
    this.state = 'menu'; // menu | playing | paused
    this.clock = new THREE.Clock();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xbfd6e8, 0.0035);

    // Lighting + sky set up in City (world owns environment)
    this.input = new Input(this.renderer.domElement);
    this.camera = new Camera(this.scene, this.renderer);
    this.save = new SaveSystem();
    this.audio = new GameAudio();
    this.settings = this.save.loadSettings() || { master: 0.8, sfx: 0.8, music: 0.6, sensitivity: 1.0 };

    // World
    this.city = new City(this.scene);

    // Player
    this.player = new Player(this.scene, this.city);
    this.player.spawn(this.city.spawnPoint());

    // Vehicles (parked around spawn for the player to enter)
    this.vehicles = [];
    this.spawnPlayerVehicles();

    // Traffic + peds
    this.traffic = new Traffic(this.scene, this.city);
    this.pedestrians = new Pedestrians(this.scene, this.city);

    // Missions
    this.missions = new Missions(this);

    // HUD + Menu (HUD first — it owns the minimap canvas that Minimap reads)
    this.hud = new HUD(this);
    this.minimap = new Minimap(this.city);
    this.menu = new Menu(this);

    // Game stats
    this.money = 5000;
    this.health = 100;
    this.armor = 0;
    this.wanted = 0;
    this.gameTime = 10 * 60; // minutes since midnight (10:00, bright morning)
    this.activeCharacter = 'marcus';
    this.inVehicle = null;
    this.lastWantedDecay = 0;

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => this.onGlobalKey(e));
  }

  spawnPlayerVehicles() {
    const sp = this.city.spawnPoint();
    const spots = [
      { x: sp.x + 4, z: sp.z + 6, color: 0xf2f2f2, type: 'sports', name: 'Stallion' },
      { x: sp.x - 4, z: sp.z + 6, color: 0x222b3a, type: 'sedan', name: 'Patriot' },
      { x: sp.x, z: sp.z + 10, color: 0x8a1a1a, type: 'muscle', name: 'Buffalo' },
    ];
    for (const s of spots) {
      const v = new Vehicle(this.scene, this.city, { color: s.color, type: s.type, name: s.name });
      v.setPosition(s.x, s.z, 0);
      this.vehicles.push(v);
    }
  }

  start() {
    this.menu.show('main');
    this.loop();
  }

  onResize() {
    this.camera.onResize();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  onGlobalKey(e) {
    if (this.state !== 'playing') return;
    if (e.code === 'Escape') this.pause();
    if (e.code === 'KeyF') this.tryToggleVehicle();
    if (e.code === 'KeyM') this.hud.toggleMap();
    if (e.code === 'KeyV') this.camera.cycleMode();
    if (e.code === 'Tab') { e.preventDefault(); this.switchCharacter(); }
  }

  switchCharacter() {
    this.activeCharacter = this.activeCharacter === 'marcus' ? 'sofia' : 'marcus';
    this.player.setActive(this.activeCharacter);
    this.audio.playTone(440, 0.08, 'sine', 0.15);
  }

  tryToggleVehicle() {
    if (this.inVehicle) {
      // exit
      const v = this.inVehicle;
      v.setControlled(false);
      const p = v.group.position;
      this.player.group.position.set(p.x + 2.2, 0, p.z);
      this.player.group.visible = true;
      this.inVehicle = null;
      this.hud.toast('Exited vehicle');
      this.audio.engineStop();
    } else {
      // find nearest vehicle within range
      let nearest = null, nd = 9;
      const pp = this.player.group.position;
      for (const v of this.vehicles) {
        const d = v.group.position.distanceTo(pp);
        if (d < nd) { nd = d; nearest = v; }
      }
      if (nearest) {
        this.player.group.visible = false;
        nearest.setControlled(true);
        this.inVehicle = nearest;
        this.hud.toast('Entered ' + nearest.name);
        this.audio.engineStart();
      }
    }
  }

  pause() {
    this.state = 'paused';
    this.menu.show('pause');
    this.input.exitLock();
  }
  resume() {
    this.state = 'playing';
    this.menu.hide();
    this.input.requestLock();
  }
  newGame() {
    this.money = 5000; this.health = 100; this.armor = 0; this.wanted = 0;
    this.gameTime = 10 * 60; this.activeCharacter = 'marcus';
    this.player.spawn(this.city.spawnPoint());
    this.missions.start(10);
    this.resume();
  }

  loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.state === 'playing') this.update(dt);
    this.renderer.render(this.scene, this.camera.cam);
  };

  update(dt) {
    // Time of day
    this.gameTime += dt * 0.5; // 1 real sec = 30 game sec
    if (this.gameTime >= 24 * 60) this.gameTime -= 24 * 60;
    this.city.setDayTime(this.gameTime);

    // Player or vehicle control
    const m = this.input.consumeMouse();
    if (this.inVehicle) {
      this.inVehicle.update(dt, this.input);
      this.camera.followVehicle(this.inVehicle, dt, m, this.settings.sensitivity);
      this.hud.speedo = this.inVehicle.speed;
    } else {
      this.player.update(dt, this.input);
      this.camera.followPlayer(this.player, dt, m, this.settings.sensitivity);
    }

    // Traffic + peds
    this.traffic.update(dt, this.inVehicle ? this.inVehicle : this.player.group.position);
    this.pedestrians.update(dt);

    // Camera world-relative + expose yaw for player-relative movement
    this.camera.update(dt);
    this.scene.userData.camYaw = this.camera.yaw;

    // Missions
    this.missions.update(dt);

    // Wanted decay
    if (this.wanted > 0) {
      this.lastWantedDecay += dt;
      if (this.lastWantedDecay > 12) { this.wanted = Math.max(0, this.wanted - 1); this.lastWantedDecay = 0; }
    }

    // HUD refresh
    this.hud.update(dt);

    // Minimap
    this.minimap.update(this.inVehicle ? this.inVehicle.group.position : this.player.group.position,
                        this.inVehicle ? this.inVehicle.heading : this.player.heading);
  }

  getSaveData() {
    return {
      money: this.money, health: this.health, armor: this.armor, wanted: this.wanted,
      gameTime: this.gameTime, activeCharacter: this.activeCharacter,
      mission: this.missions.current ? this.missions.current.id : null,
      missionStage: this.missions.stageIndex,
      playerPos: this.player.group.position.toArray(),
    };
  }
  loadSaveData(d) {
    this.money = d.money; this.health = d.health; this.armor = d.armor; this.wanted = d.wanted || 0;
    this.gameTime = d.gameTime; this.activeCharacter = d.activeCharacter || 'marcus';
    if (d.playerPos) this.player.group.position.fromArray(d.playerPos);
    this.missions.stageIndex = d.missionStage || 0;
    if (d.mission) this.missions.resume(d.mission);
  }
}
