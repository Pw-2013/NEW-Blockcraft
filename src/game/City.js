import * as THREE from 'three';

// Procedural city: a road grid with varied architecture across named districts.
export class City {
  constructor(scene) {
    this.scene = scene;
    this.blockSize = 36;   // building lot size
    this.roadWidth = 14;   // road width
    this.gridN = 9;         // gridN x gridN blocks
    this.size = this.gridN * (this.blockSize + this.roadWidth);
    this.buildings = []; // {x,z,w,d,h,color,roofType,district,enterable}
    this.roads = [];
    this.spawn = new THREE.Vector3(0, 0, 0);
    this.setupEnvironment();
    this.generate();
  }

  spawnPoint() {
    // a sidewalk corner near center
    return new THREE.Vector3(this.roadWidth / 2 + 2, 0, this.roadWidth / 2 + 2);
  }

  setupEnvironment() {
    // Sky gradient via large sphere
    const skyGeo = new THREE.SphereGeometry(900, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color(0x4a8fd6) },
        bottom: { value: new THREE.Color(0xdceaf4) },
        sunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3) },
      },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir;
        void main(){ float t = clamp((normalize(vP).y+0.1)/0.9,0.0,1.0); vec3 c = mix(bottom, top, t);
        float sun = pow(max(dot(normalize(vP), normalize(sunDir)),0.0), 80.0); c += vec3(1.0,0.9,0.7)*sun*0.6;
        gl_FragColor = vec4(c,1.0); }`,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.sky);

    // Sun (directional) + hemi
    this.sun = new THREE.DirectionalLight(0xfff2d8, 1.5);
    this.sun.position.set(120, 180, 60);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = 140;
    this.sun.shadow.camera.left = -s; this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s; this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.camera.far = 500;
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbfd6e8, 0x6b5d4a, 0.55);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.18);
    this.scene.add(this.ambient);
  }

  setDayTime(minutes) {
    // 0..1440
    const t = minutes / (24 * 60);
    const angle = t * Math.PI * 2 - Math.PI / 2;
    const sunY = Math.sin(angle);
    const sunX = Math.cos(angle);
    this.sun.position.set(sunX * 200, Math.max(10, sunY * 200), 80);
    this.sun.target.position.set(0, 0, 0);
    // intensity by sun height
    const day = THREE.MathUtils.clamp(sunY, -0.15, 1);
    this.sun.intensity = 0.25 + day * 2.0;
    this.hemi.intensity = 0.35 + day * 0.85;
    this.ambient.intensity = 0.2 + day * 0.5;
    // sky colors
    const night = new THREE.Color(0x0a1428);
    const dusk = new THREE.Color(0x2a3550);
    const dayTop = new THREE.Color(0x4a8fd6);
    const dayBot = new THREE.Color(0xdceaf4);
    const top = new THREE.Color().copy(night).lerp(dayTop, THREE.MathUtils.clamp(sunY * 1.5, 0, 1));
    const bot = new THREE.Color().copy(night).lerp(dusk, THREE.MathUtils.clamp(sunY * 2 + 0.3, 0, 1)).lerp(dayBot, THREE.MathUtils.clamp(sunY * 1.5, 0, 1));
    this.sky.material.uniforms.top.value.copy(top);
    this.sky.material.uniforms.bottom.value.copy(bot);
    this.scene.fog.color.copy(bot);
    // sun color warm at low angles
    this.sun.color.setHSL(0.08, 0.6, 0.5 + day * 0.3);
  }

  generate() {
    // ground
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a4e52, roughness: 0.95 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(this.size * 3, this.size * 3), groundMat);
    ground.rotation.x = -Math.PI / 2; ground.position.set(this.size / 2, 0, this.size / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Districts map (by grid cell quadrant)
    this.districts = this.makeDistricts();

    // Build roads grid
    this.buildRoads();
    // Build blocks + buildings
    for (let gx = 0; gx < this.gridN; gx++) {
      for (let gz = 0; gz < this.gridN; gz++) {
        const x0 = gx * (this.blockSize + this.roadWidth) + this.roadWidth;
        const z0 = gz * (this.blockSize + this.roadWidth) + this.roadWidth;
        const dist = this.districtFor(gx, gz);
        this.buildBlock(x0, z0, this.blockSize, dist, gx, gz);
      }
    }
    // Some landmark towers
    this.addLandmarks();
  }

  makeDistricts() {
    const names = [
      'Downtown', 'Oceanfront', 'Financial', 'Industrial',
      'Marina Bay', 'Suburbs', 'Entertainment', 'Shopping', 'Residential',
    ];
    // assign each grid cell a district (seeded-ish pattern)
    const map = [];
    for (let gz = 0; gz < this.gridN; gz++) {
      const row = [];
      for (let gx = 0; gx < this.gridN; gx++) {
        const idx = (gx + gz * 3) % names.length;
        row.push(names[idx]);
      }
      map.push(row);
    }
    return map;
  }
  districtFor(gx, gz) { return this.districts[gz][gx]; }

  buildRoads() {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3c4045, roughness: 0.85 });
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.7 });
    const step = this.blockSize + this.roadWidth;
    // horizontal + vertical roads
    for (let i = 0; i <= this.gridN; i++) {
      const c = i * step;
      // horizontal road (along X)
      const rh = new THREE.Mesh(new THREE.PlaneGeometry(this.size + step, this.roadWidth), roadMat);
      rh.rotation.x = -Math.PI/2; rh.position.set(this.size/2, 0.02, c + this.roadWidth/2);
      rh.receiveShadow = true; this.scene.add(rh);
      // center line
      const lh = new THREE.Mesh(new THREE.PlaneGeometry(this.size + step, 0.3), lineMat);
      lh.rotation.x = -Math.PI/2; lh.position.set(this.size/2, 0.03, c + this.roadWidth/2); this.scene.add(lh);
      // vertical road
      const rv = new THREE.Mesh(new THREE.PlaneGeometry(this.roadWidth, this.size + step), roadMat);
      rv.rotation.x = -Math.PI/2; rv.position.set(c + this.roadWidth/2, 0.02, this.size/2);
      rv.receiveShadow = true; this.scene.add(rv);
      const lv = new THREE.Mesh(new THREE.PlaneGeometry(0.3, this.size + step), lineMat);
      lv.rotation.x = -Math.PI/2; lv.position.set(c + this.roadWidth/2, 0.03, this.size/2); this.scene.add(lv);
      this.roads.push(c + this.roadWidth/2);
    }
    // sidewalks around blocks handled in buildBlock
  }

  buildBlock(x0, z0, size, district, gx, gz) {
    // sidewalk pad
    const sw = 1.5;
    const swMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.95 });
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(size + sw*2, size + sw*2), swMat);
    pad.rotation.x = -Math.PI/2; pad.position.set(x0 + size/2, 0.01, z0 + size/2);
    pad.receiveShadow = true; this.scene.add(pad);

    // decide lot split per district
    const style = this.districtStyle(district);
    // subdivide block into 1-4 lots
    const splits = style.bigLot ? 1 : (Math.random() < 0.5 ? 2 : 4);
    if (splits === 1) {
      this.buildLot(x0 + 1, z0 + 1, size - 2, style);
    } else if (splits === 2) {
      const half = (size - 3) / 2;
      this.buildLot(x0 + 1, z0 + 1, half, style);
      this.buildLot(x0 + 1 + half + 1, z0 + 1, half, style);
    } else {
      const q = (size - 4) / 2;
      this.buildLot(x0 + 1, z0 + 1, q, style);
      this.buildLot(x0 + 1 + q + 1, z0 + 1, q, style);
      this.buildLot(x0 + 1, z0 + 1 + q + 1, q, style);
      this.buildLot(x0 + 1 + q + 1, z0 + 1 + q + 1, q, style);
    }
  }

  districtStyle(d) {
    const palettes = {
      Downtown:     [0x8a8d8f, 0x707880, 0x5a5f63],
      Oceanfront:    [0xd6c9b8, 0xe0d8cc, 0xc8b8a0],
      Financial:     [0x6a7080, 0x506078, 0x404a55],
      Industrial:    [0x7a6a5a, 0x665a4f, 0x555049],
      'Marina Bay':  [0xd0d8e0, 0xc0c8d8, 0xb0bcc8],
      Suburbs:       [0xc8b48e, 0xb8a47e, 0xa89474],
      Entertainment: [0x9a3a4a, 0x8a2a3a, 0x6a2030],
      Shopping:      [0xb0a090, 0xa09080, 0x908070],
      Residential:   [0xc0b0a0, 0xb0a090, 0xa09080],
    };
    const cols = palettes[d] || palettes.Downtown;
    const big = d === 'Financial' || d === 'Downtown';
    const tall = d === 'Financial' ? [40, 90] : d === 'Downtown' ? [20, 60] : d === 'Industrial' ? [8, 18] : d === 'Suburbs' || d === 'Residential' ? [5, 12] : [12, 30];
    return { cols, bigLot: big, tall };
  }

  buildLot(x, z, w, style) {
    const h = THREE.MathUtils.lerp(style.tall[0], style.tall[1], Math.random());
    const color = style.cols[Math.floor(Math.random() * style.cols.length)];
    const d = this.depthFor(x, z);
    // facade material with subtle window texture via emissive grid
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
    b.position.set(x + w/2, h/2, z + w/2);
    b.castShadow = true; b.receiveShadow = true;
    this.scene.add(b);

    // window emissive grid (a second slightly inset mesh with texture-less approach: strips)
    this.addWindows(b, w, h, w, color);

    // roof detail
    this.addRoof(b, x + w/2, z + w/2, w, h, style);

    // enterable interior for a few story buildings
    const enterable = h < 20 && Math.random() < 0.25;
    this.buildings.push({ x: x + w/2, z: z + w/2, w, d: w, h, color, enterable });
  }

  addWindows(building, w, h, d, baseColor) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x223040, emissive: 0x223040, emissiveIntensity: 0.0, roughness: 0.3, metalness: 0.2 });
    const cols = Math.max(2, Math.floor(w / 2.2));
    const rows = Math.max(2, Math.floor(h / 3));
    const padX = w / cols, padY = h / rows;
    // We simulate windows cheaply with thin emissive planes on the 4 faces
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const y = (r + 0.5) * padY;
        // front & back
        for (const fz of [d/2 + 0.01, -d/2 - 0.01]) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(padX*0.5, padY*0.5), mat);
          win.position.set(-w/2 + (c+0.5)*padX, y - h/2, fz);
          if (fz < 0) win.rotation.y = Math.PI;
          building.add(win);
        }
        for (const fx of [w/2 + 0.01, -w/2 - 0.01]) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(d*0.5*(d/w || 1)*0.5, padY*0.5), mat);
          win.position.set(fx, y - h/2, 0);
          win.rotation.y = fx > 0 ? Math.PI/2 : -Math.PI/2;
          building.add(win);
        }
      }
    }
    // store ref for night lighting
    building.userData.windows = mat;
  }

  addRoof(building, x, z, w, h, style) {
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.9 });
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 1.5, w * 0.4), roofMat);
    cap.position.set(x, h + 0.75, z); cap.castShadow = true; this.scene.add(cap);
    if (style.bigLot) {
      // antenna
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 8), roofMat);
      ant.position.set(x, h + 4, z); this.scene.add(ant);
    }
  }

  addLandmarks() {
    // central park-ish plaza + a couple of towers
    const cx = this.size / 2, cz = this.size / 2;
    // park
    const park = new THREE.Mesh(new THREE.PlaneGeometry(this.blockSize, this.blockSize), new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 1 }));
    park.rotation.x = -Math.PI/2; park.position.set(cx, 0.05, cz); this.scene.add(park);
    // trees
    for (let i = 0; i < 6; i++) {
      const tx = cx + (Math.random() - 0.5) * this.blockSize * 0.7;
      const tz = cz + (Math.random() - 0.5) * this.blockSize * 0.7;
      this.addTree(tx, tz);
    }
  }

  addTree(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x5a3a20 }));
    trunk.position.set(x, 1.2, z); trunk.castShadow = true; this.scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), new THREE.MeshStandardMaterial({ color: 0x3a6a30, roughness: 1 }));
    leaves.position.set(x, 3, z); leaves.castShadow = true; this.scene.add(leaves);
  }

  depthFor(x, z) { return this.blockSize - 2; }

  // Helpers for traffic/peds: list of road centerlines
  roadLines() { return this.roads; }
  // is point on road?
  isRoad(x, z) {
    const step = this.blockSize + this.roadWidth;
    const remX = ((x % step) + step) % step;
    const remZ = ((z % step) + step) % step;
    return remX < this.roadWidth || remZ < this.roadWidth;
  }
  // nearest road point
  nearestRoadPoint(x, z) {
    const step = this.blockSize + this.roadWidth;
    const idx = Math.round((x - this.roadWidth/2) / step);
    const rx = idx * step + this.roadWidth/2;
    return { x: rx, z };
  }

  districtNameAt(x, z) {
    const step = this.blockSize + this.roadWidth;
    const gx = THREE.MathUtils.clamp(Math.floor((x - this.roadWidth) / step), 0, this.gridN - 1);
    const gz = THREE.MathUtils.clamp(Math.floor((z - this.roadWidth) / step), 0, this.gridN - 1);
    return this.districtFor(gx, gz);
  }
}
