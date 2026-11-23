import * as THREE from 'three';

// Simple traffic AI: cars drive along road grid lines, turning at intersections.
export class Traffic {
  constructor(scene, city) {
    this.scene = scene; this.city = city;
    this.cars = [];
    this.colors = [0xb03030, 0x2040a0, 0x208040, 0xc0a020,0x909090,0xe0e0e0,0x404060,0xa04020];
    this.maxCars = 24;
    this.spawn();
  }

  makeCar(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 4.2), new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 }));
    body.position.y = 0.5; body.castShadow = true; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.1, transparent: true, opacity: 0.7 }));
    cab.position.set(0, 0.95, 0); g.add(cab);
    for (const px of [-0.85, 0.85]) for (const pz of [1.4, -1.4]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.26, 10), new THREE.MeshStandardMaterial({ color: 0x0a0a0a }));
      w.rotation.z = Math.PI/2; w.position.set(px, 0.38, pz); g.add(w);
    }
    return g;
  }

  spawn() {
    const lines = this.city.roadLines();
    for (let i = 0; i < this.maxCars; i++) {
      const color = this.colors[i % this.colors.length];
      const car = this.makeCar(color);
      const line = lines[Math.floor(Math.random()*lines.length)];
      const along = Math.random() * this.city.size;
      const horiz = Math.random() < 0.5;
      const pos = horiz ? new THREE.Vector3(along, 0, line) : new THREE.Vector3(line, 0, along);
      car.position.copy(pos);
      const heading = Math.random() < 0.5 ? 0 : Math.PI;
      car.rotation.y = heading;
      car.userData = { heading, speed: 6 + Math.random()*6, horiz, line, along, dir: Math.random()<0.5?1:-1 };
      this.scene.add(car);
      this.cars.push(car);
    }
  }

  update(dt, playerPos) {
    for (const car of this.cars) {
      const ud = car.userData;
      // move along axis
      if (ud.dir > 0) ud.along += ud.speed * dt;
      else ud.along -= ud.speed * dt;
      if (ud.along > this.city.size) { ud.along = 0; }
      if (ud.along < 0) { ud.along = this.city.size; }
      if (ud.horiz) car.position.set(ud.along, 0, ud.line);
      else car.position.set(ud.line, 0, ud.along);
      car.rotation.y = ud.horiz ? (ud.dir > 0 ? Math.PI/2 : -Math.PI/2) : (ud.dir > 0 ? 0 : Math.PI);

      // occasionally switch lanes/turn at intersection
      if (Math.random() < 0.002) {
        const lines = this.city.roadLines();
        const nl = lines[Math.floor(Math.random()*lines.length)];
        // teleport lane change when near a line crossing (cheap)
        ud.line = nl;
        ud.horiz = Math.random() < 0.5;
      }
      // slow near player to avoid obvious overlap (very basic)
      const d = car.position.distanceTo(playerPos);
      if (d < 4) ud.speed = Math.max(0, ud.speed - 2 * dt);
      else ud.speed = Math.min(ud.speed + 0.5*dt, 12);
    }
  }
}
