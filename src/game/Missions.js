import * as THREE from 'three';

// Story campaign. Missions 1-9 are backstory only; first playable is Mission 10.
export class Missions {
  constructor(engine) {
    this.engine = engine;
    this.current = null;
    this.stageIndex = 0;
    this.marker = null;
    this.checkpoint = null;
    this.defs = [
      { id: 10, title: 'FAMILY MATTERS', briefing: 'Marcus and Sofia receive unexpected news about someone close to them. Drive to the marina to meet the contact.' },
      { id: 11, title: 'DOUBLE CROSS', briefing: 'A business arrangement takes an unexpected turn. Get to the warehouse in the Industrial district.' },
      { id: 12, title: 'THE HARBOUR', briefing: 'The protagonists get drawn into trouble at Viceport\u2019s industrial waterfront.' },
      { id: 13, title: 'LAST CHANCE', briefing: 'Plans begin to unravel. Make the difficult drive across town before time runs out.' },
      { id: 14, title: 'THE FINAL DEAL', briefing: 'A major confrontation changes everything. Head to the Financial District.' },
      { id: 15, title: 'A NEW TOMORROW', briefing: 'Deliver a cinematic conclusion. Reach the Oceanfront to finish the story.' },
    ];
    // mission 1-9 listed but locked (backstory)
    for (let i = 1; i <= 9; i++) this.defs.unshift({ id: i, title: 'BACKSTORY', briefing: 'Not playable — part of Marcus and Sofia\u2019s history before the events of Grand City.' });
  }

  start(id) {
    const def = this.defs.find(d => d.id === id);
    if (!def) return;
    this.current = def;
    this.stageIndex = 0;
    this.engine.hud.toast(def.briefing);
    this.engine.hud.objective('Go to the mission marker (yellow beacon)');
    this.placeMarker(this.engine.city.spawnPoint().clone().add(new THREE.Vector3(60, 0, 80)));
  }

  resume(id) {
    const def = this.defs.find(d => d.id === id);
    if (!def) return;
    this.current = def;
    this.engine.hud.objective('Continue: ' + def.title);
  }

  placeMarker(pos) {
    if (this.marker) this.engine.scene.remove(this.marker);
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 30, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    beam.position.y = 15; g.add(beam);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.2, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffd24a }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; g.add(ring);
    g.position.set(pos.x, 0, pos.z);
    this.marker = g;
    this.markerPos = new THREE.Vector2(pos.x, pos.z);
    this.engine.scene.add(g);
  }

  update(dt) {
    if (!this.current || !this.marker) return;
    // spin ring
    this.marker.children[1].rotation.z += dt * 2;
    // check arrival
    const pos = this.engine.inVehicle ? this.engine.inVehicle.group.position : this.engine.player.group.position;
    const d = Math.hypot(pos.x - this.markerPos.x, pos.z - this.markerPos.y);
    if (d < 4) this.advance();
  }

  advance() {
    if (!this.current) return;
    this.stageIndex++;
    if (this.current.id === 10) {
      const stages = [
        'You\u2019ve arrived at the marina. Sofia is waiting — walk to the marker.',
        'SOFIA: "Marcus... it\u2019s Danny. He\u2019s gone. We need to talk, now."',
        'MARCUS: "Gone? What do you mean gone?"',
        'SOFIA: "There\u2019s money involved. A lot of it. And people who\u2019ll come looking for us next."',
        'MARCUS: "Then we move first. Get to the car — we\u2019re going to the old warehouse."',
        'Drive to the next marker in the Industrial district.',
      ];
      if (this.stageIndex < stages.length) {
        this.engine.hud.toast(stages[this.stageIndex]);
        if (this.stageIndex === stages.length - 1) {
          // relocate marker to industrial
          this.placeMarker(new THREE.Vector3(this.engine.city.size * 0.15, 0, this.engine.city.size * 0.15));
        }
      } else {
        this.complete();
      }
    } else {
      // generic: each mission just requires reaching a marker, then complete
      if (this.stageIndex >= 3) this.complete();
      else {
        this.engine.hud.toast(this.current.title + ' — stage ' + (this.stageIndex + 1));
        this.placeMarker(new THREE.Vector3(
          Math.random() * this.engine.city.size, 0, Math.random() * this.engine.city.size));
      }
    }
  }

  complete() {
    if (!this.current) return;
    const reward = 2000;
    this.engine.money += reward;
    this.engine.hud.toast('MISSION COMPLETE: ' + this.current.title + ' (+$' + reward + ')');
    this.engine.hud.objective('');
    if (this.marker) { this.engine.scene.remove(this.marker); this.marker = null; }
    const next = this.defs.find(d => d.id === this.current.id + 1 && d.id >= 10);
    this.current = null;
    if (next) {
      setTimeout(() => { if (!this.current) this.start(next.id); }, 4000);
    } else {
      this.engine.hud.toast('CAMPAIGN COMPLETE — A NEW TOMORROW. Explore the city freely.');
    }
  }

  fail() {
    if (!this.current) return;
    this.engine.hud.toast('MISSION FAILED');
    this.engine.hud.objective('');
    if (this.marker) { this.engine.scene.remove(this.marker); this.marker = null; }
    this.current = null;
  }
}
