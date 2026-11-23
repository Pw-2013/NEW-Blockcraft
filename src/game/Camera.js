import * as THREE from 'three';

export class Camera {
  constructor(scene, renderer) {
    this.scene = scene;
    this.cam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.3, 2000);
    this.cam.position.set(0, 12, 18);
    this.modes = ['follow', 'far', 'cinematic'];
    this.modeIndex = 0;
    this.yaw = 0;
    this.pitch = -0.35;
    this.dist = 7.5;
    this.height = 3.2;
    this.tmp = new THREE.Vector3();
    this.desired = new THREE.Vector3();
  }

  cycleMode() {
    this.modeIndex = (this.modeIndex + 1) % this.modes.length;
    this.dist = this.modes[this.modeIndex] === 'far' ? 12 : this.modes[this.modeIndex] === 'cinematic' ? 6 : 7.5;
    this.height = this.modes[this.modeIndex] === 'far' ? 5 : 3.2;
  }

  onResize() {
    this.cam.aspect = window.innerWidth / window.innerHeight;
    this.cam.updateProjectionMatrix();
  }

  followPlayer(player, dt, m, sens) {
    this.yaw -= m.dx * 0.0022 * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch - m.dy * 0.0022 * sens, -1.0, -0.05);
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist,
      Math.sin(-this.pitch) * this.dist + this.height,
      Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist
    );
    this.desired.copy(player.group.position).add(offset);
    this.cam.position.lerp(this.desired, 1 - Math.pow(0.001, dt));
    this.tmp.copy(player.group.position).add(new THREE.Vector3(0, 1.6, 0));
    this.cam.lookAt(this.tmp);
  }

  followVehicle(vehicle, dt, m, sens) {
    this.yaw -= m.dx * 0.0018 * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch - m.dy * 0.0018 * sens, -0.9, 0.1);
    // bias yaw toward vehicle heading when no mouse input
    if (m.dx === 0 && m.dy === 0) {
      const target = -vehicle.heading + Math.PI;
      this.yaw = THREE.MathUtils.lerpAngle(this.yaw, target, 1 - Math.pow(0.02, dt));
    }
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist,
      Math.sin(-this.pitch) * 1.5 + this.height,
      Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist
    );
    this.desired.copy(vehicle.group.position).add(offset);
    this.cam.position.lerp(this.desired, 1 - Math.pow(0.0001, dt));
    this.tmp.copy(vehicle.group.position).add(new THREE.Vector3(0, 1.2, 0));
    this.cam.lookAt(this.tmp);
  }

  update(dt) {
    // simple camera collision against ground
    if (this.cam.position.y < 1.2) this.cam.position.y = 1.2;
  }
}
