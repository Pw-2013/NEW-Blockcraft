// Centralized input handling — keyboard + mouse.
export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, left: false, right: false, locked: false };
    this._onKeyDown = (e) => {
      this.keys[e.code] = true;
      if (['KeyW','KeyA','KeyS','KeyD','Space','Tab'].includes(e.code)) e.preventDefault();
      if (this.onKeyDown) this.onKeyDown(e.code);
    };
    this._onKeyUp = (e) => { this.keys[e.code] = false; };
    this._onMouseMove = (e) => {
      if (this.mouse.locked) {
        this.mouse.dx += e.movementX;
        this.mouse.dy += e.movementY;
      }
    };
    this._onMouseDown = (e) => { if (e.button === 0) this.mouse.left = true; if (e.button === 2) this.mouse.right = true; };
    this._onMouseUp = (e) => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; };
    this._onLockChange = () => { this.mouse.locked = (document.pointerLockElement === this.dom); if (!this.mouse.locked) { this.keys = {}; this.mouse.left = this.mouse.right = false; } };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    this.dom.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('pointerlockchange', this._onLockChange);
    this.dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  requestLock() {
    if (!this.dom.requestPointerLock) return;
    try {
      const p = this.dom.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => {/* pointer lock unavailable in this context */});
    } catch (e) { /* ignore */ }
  }
  exitLock() { if (document.exitPointerLock) document.exitPointerLock(); }
  // Consume accumulated mouse delta (call once per frame).
  consumeMouse() { const d = { dx: this.mouse.dx, dy: this.mouse.dy }; this.mouse.dx = 0; this.mouse.dy = 0; return d; }
  isDown(code) { return !!this.keys[code]; }
  wasPressed(code) {
    // edge-trigger helper; caller manages state via consume
    return !!this.keys[code];
  }
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    this.dom.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('pointerlockchange', this._onLockChange);
  }
}
