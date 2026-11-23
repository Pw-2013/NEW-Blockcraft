import * as THREE from 'three';

// Lightweight pedestrians walking on sidewalks.
export class Pedestrians {
  constructor(scene, city) {
    this.scene = scene; this.city = city;
    this.peds = [];
    this.maxPeds = 40;
    this.colors = [0x3a6ea0,0x8a3a4a,0x3a8a4a,0xaaaa44,0x707080,0x9a5a20];
    this.spawn();
  }

  makePed(color) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: 0xc99a6a, roughness: 0.8 });
    const cm = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const pm = new THREE.MeshStandardMaterial({ color: 0x202028, roughness: 0.9 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.24), cm); torso.position.y = 1.05; g.add(torso);
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.22), pm); hips.position.y = 0.7; g.add(hips);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), m); head.position.y = 1.5; g.add(head);
    const lL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), pm); lL.position.set(-0.1, 0.35, 0); g.add(lL);
    const lR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), pm); lR.position.set(0.1, 0.35, 0); g.add(lR);
    g.userData = { lL, lR, phase: Math.random()*Math.PI*2 };
    return g;
  }

  spawn() {
    for (let i = 0; i < this.maxPeds; i++) {
      const p = this.makePed(this.colors[i % this.colors.length]);
      const x = Math.random() * this.city.size;
      const z = Math.random() * this.city.size;
      p.position.set(x, 0, z);
      p.userData.heading = Math.random() * Math.PI * 2;
      p.userData.speed = 1 + Math.random();
      this.scene.add(p);
      this.peds.push(p);
    }
  }

  update(dt) {
    for (const p of this.peds) {
      const ud = p.userData;
      // wander
      if (Math.random() < 0.01) ud.heading += (Math.random() - 0.5) * 1.2;
      p.position.x += Math.sin(ud.heading) * ud.speed * dt;
      p.position.z += Math.cos(ud.heading) * ud.speed * dt;
      p.rotation.y = ud.heading;
      // bounds
      if (p.position.x < 0) p.position.x = this.city.size;
      if (p.position.x > this.city.size) p.position.x = 0;
      if (p.position.z < 0) p.position.z = this.city.size;
      if (p.position.z > this.city.size) p.position.z = 0;
      // walk anim
      ud.phase += dt * ud.speed * 3;
      const s = Math.sin(ud.phase) * 0.3;
      ud.lL.position.z = s;
      ud.lR.position.z = -s;
    }
  }
}
