import * as THREE from 'three';

// A stylized humanoid protagonist with procedural walk animation.
export class Player {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.group = new THREE.Group();
    this.heading = 0; // radians, 0 = +Z
    this.speed = 0;
    this.walkPhase = 0;
    this.active = 'marcus';
    this.build();
    scene.add(this.group);
  }

  setActive(c) { this.active = c; this.applySkin(); }

  applySkin() {
    const skins = {
      marcus: { shirt: 0x2a4d6e, pants: 0x20262e, skin: 0xc99a6a, hair: 0x1a1a1a },
      sofia:  { shirt: 0x8a2d4d, pants: 0x1a1a22, skin: 0xe0b48c, hair: 0x3a2418 },
    };
    const s = skins[this.active] || skins.marcus;
    this.matShirt.color.setHex(s.shirt);
    this.matPants.color.setHex(s.pants);
    this.matSkin.color.setHex(s.skin);
    this.matHair.color.setHex(s.hair);
  }

  build() {
    this.matSkin = new THREE.MeshStandardMaterial({ color: 0xc99a6a, roughness: 0.7 });
    this.matShirt = new THREE.MeshStandardMaterial({ color: 0x2a4d6e, roughness: 0.8 });
    this.matPants = new THREE.MeshStandardMaterial({ color: 0x20262e, roughness: 0.85 });
    this.matHair = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
    this.matShoe = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), this.matShirt);
    torso.position.y = 1.15; torso.castShadow = true;
    this.group.add(torso);
    // Hips
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.3), this.matPants);
    hips.position.y = 0.78; hips.castShadow = true; this.group.add(hips);
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.24), this.matSkin);
    head.position.y = 1.66; head.castShadow = true; this.group.add(head);
    // Hair cap
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.26), this.matHair);
    hair.position.y = 1.78; this.group.add(hair);
    // Arms (pivot groups)
    this.armL = this.makeLimb(0.14, 0.62, this.matShirt);
    this.armL.position.set(-0.34, 1.45, 0); this.group.add(this.armL);
    this.armR = this.makeLimb(0.14, 0.62, this.matShirt);
    this.armR.position.set(0.34, 1.45, 0); this.group.add(this.armR);
    // Legs
    this.legL = this.makeLimb(0.16, 0.72, this.matPants, this.matShoe);
    this.legL.position.set(-0.14, 0.72, 0); this.group.add(this.legL);
    this.legR = this.makeLimb(0.16, 0.72, this.matPants, this.matShoe);
    this.legR.position.set(0.14, 0.72, 0); this.group.add(this.legR);
    // shadow blob fallback
    this.applySkin();
  }

  makeLimb(w, l, mat, footMat) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, l, w), mat);
    m.position.y = -l / 2; m.castShadow = true; g.add(m);
    if (footMat) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, 0.12, w * 1.6), footMat);
      f.position.set(0, -l + 0.05, w * 0.4); g.add(f);
    }
    return g;
  }

  spawn(pos) {
    this.group.position.set(pos.x, 0, pos.z);
    this.heading = 0;
  }

  update(dt, input) {
    const fwd = (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0);
    const strafe = (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0);
    const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const moveMag = Math.min(1, Math.hypot(fwd, strafe));
    const maxSpeed = sprint ? 11 : 5.5;
    const accel = 26;

    if (moveMag > 0.01) {
      this.speed = Math.min(maxSpeed, this.speed + accel * dt);
      // turn toward movement direction relative to camera yaw handled here simply by world keys
      // Use WASD relative to camera: W = away from camera forward
      // We approximate forward by camera's view dir projected
    } else {
      this.speed = Math.max(0, this.speed - 30 * dt);
    }
    // Determine desired heading from input relative to camera yaw (engine.camera.yaw)
    // We pass camera yaw via a global-ish read; instead rotate by keys directly.
    const cam = this.scene.userData.camYaw || 0;
    // forward vector (camera looks toward -Z-ish); compute movement angle
    let dirX = 0, dirZ = 0;
    const f = new THREE.Vector3(Math.sin(cam), 0, Math.cos(cam));
    const r = new THREE.Vector3(Math.cos(cam), 0, -Math.sin(cam));
    const mv = new THREE.Vector3();
    mv.addScaledVector(f, fwd);
    mv.addScaledVector(r, strafe);
    if (mv.lengthSq() > 0.001) {
      mv.normalize();
      const targetHeading = Math.atan2(mv.x, mv.z);
      // smooth turn
      let diff = targetHeading - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, dt * 12);
      this.group.position.x += mv.x * this.speed * dt;
      this.group.position.z += mv.z * this.speed * dt;
    }

    this.group.rotation.y = this.heading;
    // keep on ground
    this.group.position.y = 0;
    // animation
    this.walkPhase += dt * (this.speed * 1.1 + 2);
    const swing = Math.sin(this.walkPhase) * Math.min(1, this.speed / 4) * 0.6;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.armL.rotation.x = -swing * 0.8;
    this.armR.rotation.x = swing * 0.8;
  }
}
