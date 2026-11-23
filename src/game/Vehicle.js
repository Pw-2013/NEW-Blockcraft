import * as THREE from 'three';

// Arcade-style car with believable weight transfer, grip, and steering.
export class Vehicle {
  constructor(scene, city, opts = {}) {
    this.scene = scene; this.city = city;
    this.name = opts.name || 'Car';
    this.type = opts.type || 'sedan';
    this.color = opts.color ?? 0xcc2222;
    this.group = new THREE.Group();
    this.heading = 0; // radians
    this.speed = 0;   // m/s forward
    this.steer = 0;
    this.wheels = [];
    this.controlled = false;
    this.build();
    scene.add(this.group);
  }

  build() {
    const cfg = {
      sports:  { len: 4.2, wid: 1.9, h: 0.55, wheel: 0.42, power: 320, mass: 1.0 },
      sedan:   { len: 4.6, wid: 1.85, h: 0.6, wheel: 0.44, power: 200, mass: 1.2 },
      muscle:  { len: 4.8, wid: 1.95, h: 0.58, wheel: 0.46, power: 280, mass: 1.3 },
      suv:     { len: 4.7, wid: 2.0, h: 0.8, wheel: 0.5, power: 230, mass: 1.6 },
    }[this.type] || {};
    this.cfg = cfg;

    const bodyMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.35, metalness: 0.7 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x10141a, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.7 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.5, metalness: 0.5 });

    // lower body
    const lower = new THREE.Mesh(new THREE.BoxGeometry(cfg.wid, cfg.h, cfg.len), bodyMat);
    lower.position.y = cfg.wheel + cfg.h * 0.4; lower.castShadow = true; lower.receiveShadow = true;
    this.group.add(lower);
    // cabin
    const cabLen = cfg.len * 0.5, cabH = cfg.h * 0.7;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(cfg.wid * 0.86, cabH, cabLen), bodyMat);
    cab.position.set(0, cfg.wheel + cfg.h + cabH * 0.45, -cfg.len * 0.02);
    cab.castShadow = true; this.group.add(cab);
    // greenhouse glass
    const glass = new THREE.Mesh(new THREE.BoxGeometry(cfg.wid * 0.78, cabH * 0.7, cabLen * 0.82), glassMat);
    glass.position.set(0, cfg.wheel + cfg.h + cabH * 0.5, -cfg.len * 0.02);
    this.group.add(glass);
    // headlights
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff7d0, emissive: 0xfff2c0, emissiveIntensity: 0.4 });
    for (const sx of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), hlMat);
      hl.position.set(sx * cfg.wid * 0.36, cfg.wheel + cfg.h * 0.5, cfg.len * 0.5);
      this.group.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2222, emissiveIntensity: 0.5 }));
      tl.position.set(sx * cfg.wid * 0.36, cfg.wheel + cfg.h * 0.5, -cfg.len * 0.5);
      this.group.add(tl);
    }
    // wheels (4)
    const wR = cfg.wheel, wW = 0.3;
    const positions = [
      [-cfg.wid/2 + 0.1, cfg.len*0.32], [cfg.wid/2 - 0.1, cfg.len*0.32],
      [-cfg.wid/2 + 0.1, -cfg.len*0.32], [cfg.wid/2 - 0.1, -cfg.len*0.32],
    ];
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.3 });
    this.wheels = [];
    for (const [px, pz] of positions) {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(wR, wR, wW, 16), wheelMat);
      tire.rotation.z = Math.PI / 2; wg.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wR*0.55, wR*0.55, wW*1.05, 12), rimMat);
      rim.rotation.z = Math.PI/2; wg.add(rim);
      wg.position.set(px, wR, pz);
      wg.castShadow = true;
      this.group.add(wg);
      this.wheels.push({ group: wg, front: pz > 0 });
    }

    // roof trim line
    const trim = new THREE.Mesh(new THREE.BoxGeometry(cfg.wid*0.88, 0.04, cabLen*0.95), trimMat);
    trim.position.set(0, cfg.wheel + cfg.h + cabH*0.85, 0);
    this.group.add(trim);
  }

  setPosition(x, z, heading) {
    this.group.position.set(x, 0, z);
    this.heading = heading;
    this.group.rotation.y = heading;
  }
  setControlled(c) { this.controlled = c; }

  update(dt, input) {
    if (this.controlled) {
      const throttle = (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0);
      const steerInput = (input.isDown('KeyA') ? 1 : 0) - (input.isDown('KeyD') ? 1 : 0);
      const brake = input.isDown('Space');
      const handbrake = input.isDown('ShiftLeft');

      // steering with speed sensitivity
      const maxSteer = 0.55 * (1 - Math.min(0.6, Math.abs(this.speed) / 60));
      this.steer = THREE.MathUtils.lerp(this.steer, steerInput * maxSteer, 1 - Math.pow(0.001, dt));

      // engine force
      const power = this.cfg.power;
      const drag = 0.4 + 0.02 * Math.abs(this.speed);
      if (throttle > 0) this.speed += (power * throttle / this.cfg.mass) * dt * 0.6;
      else if (throttle < 0) {
        if (this.speed > 0.5) this.speed -= (power * 1.4 / this.cfg.mass) * dt * 0.6; // braking
        else this.speed -= (power * 0.5 / this.cfg.mass) * dt * 0.6; // reverse
      } else {
        // engine braking
        this.speed -= Math.sign(this.speed) * 6 * dt;
        if (Math.abs(this.speed) < 0.3) this.speed = 0;
      }
      if (brake) this.speed -= Math.sign(this.speed) * 14 * dt;
      if (handbrake) this.speed -= Math.sign(this.speed) * 8 * dt;
      this.speed = THREE.MathUtils.clamp(this.speed, -14, 65);
      this.speed -= drag * Math.sign(this.speed) * dt;

      // heading change based on steer and speed (only turns when moving)
      const turnFactor = Math.min(1, Math.abs(this.speed) / 6);
      this.heading += this.steer * turnFactor * dt * 1.8 * (this.speed >= 0 ? 1 : -1);
    } else {
      // idle parked friction
      this.speed *= Math.pow(0.5, dt * 2);
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }

    // integrate position
    const vx = Math.sin(this.heading) * this.speed;
    const vz = Math.cos(this.heading) * this.speed;
    this.group.position.x += vx * dt;
    this.group.position.z += vz * dt;
    this.group.position.y = 0;
    this.group.rotation.y = this.heading;

    // wheel spin + steer visual
    const spin = this.speed * dt * 2.2;
    for (const w of this.wheels) {
      w.group.children[0].rotation.x -= spin;
      if (w.front) w.group.rotation.y = this.steer;
    }
  }
}
