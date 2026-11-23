// Minimap drawn on a 2D canvas, GTA-style, rotating with player heading.
export class Minimap {
  constructor(city) {
    this.city = city;
    this.canvas = document.getElementById('minimap');
    this.ctx = this.canvas.getContext('2d');
    this.scale = 0; // computed
    this.view = 200; // world units shown
    this.markerImg = null;
  }

  draw(ctx, cx, cz, heading, size) {
    const c = ctx.canvas;
    const W = c.width, H = c.height;
    const cxp = W / 2, cyp = H / 2;
    const k = W / this.view; // px per world unit
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#202020'; ctx.fillRect(0, 0, W, H);

    // rotate so up = player heading
    ctx.translate(cxp, cyp);
    ctx.rotate(-heading);

    // roads
    const step = this.city.blockSize + this.city.roadWidth;
    ctx.strokeStyle = '#3a3f44'; ctx.lineWidth = this.city.roadWidth * k;
    ctx.lineCap = 'square';
    for (let i = 0; i <= this.city.gridN; i++) {
      const v = i * step + this.city.roadWidth/2 - cz;
      const u = i * step + this.city.roadWidth/2 - cx;
      // horizontal road
      ctx.beginPath();
      ctx.moveTo(-cx, v); ctx.lineTo(this.city.size - cx, v); ctx.stroke();
      // vertical
      ctx.beginPath();
      ctx.moveTo(u, -cz); ctx.lineTo(u, this.city.size - cz); ctx.stroke();
    }
    // blocks (districts tint)
    for (let gz = 0; gz < this.city.gridN; gz++)
      for (let gx = 0; gx < this.city.gridN; gx++) {
        const x0 = gx*step + this.city.roadWidth - cx;
        const z0 = gz*step + this.city.roadWidth - cz;
        const d = this.city.districts[gz][gx];
        ctx.fillStyle = this.districtColor(d);
        ctx.fillRect(x0, z0, this.city.blockSize, this.city.blockSize);
      }

    ctx.restore();

    // player wedge
    ctx.save();
    ctx.translate(cxp, cyp);
    ctx.rotate(-heading);
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(-4, 5); ctx.lineTo(4, 5); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  update(pos, heading) {
    this.draw(this.ctx, pos.x, pos.z, heading, 200);
  }

  drawBig(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,W,H);
    const k = W / (this.city.size + this.city.roadWidth);
    const step = this.city.blockSize + this.city.roadWidth;
    ctx.strokeStyle = '#555'; ctx.lineWidth = this.city.roadWidth * k;
    for (let i = 0; i <= this.city.gridN; i++) {
      const v = (i*step + this.city.roadWidth/2) * k;
      ctx.beginPath(); ctx.moveTo(0,v); ctx.lineTo(W,v); ctx.stroke();
      const u = (i*step + this.city.roadWidth/2) * k;
      ctx.beginPath(); ctx.moveTo(u,0); ctx.lineTo(u,H); ctx.stroke();
    }
    for (let gz = 0; gz < this.city.gridN; gz++)
      for (let gx = 0; gx < this.city.gridN; gx++) {
        const x0 = (gx*step + this.city.roadWidth) * k;
        const z0 = (gz*step + this.city.roadWidth) * k;
        ctx.fillStyle = this.districtColor(this.city.districts[gz][gx]);
        ctx.fillRect(x0, z0, this.city.blockSize*k, this.city.blockSize*k);
      }
    // labels
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign='center';
    for (let gz = 0; gz < this.city.gridN; gz++)
      for (let gx = 0; gx < this.city.gridN; gx++) {
        const x0 = (gx*step + this.city.roadWidth + this.city.blockSize/2) * k;
        const z0 = (gz*step + this.city.roadWidth + this.city.blockSize/2) * k;
        ctx.fillText(this.city.districts[gz][gx], x0, z0);
      }
  }

  districtColor(d) {
    const map = {
      Downtown:'#3a4048', Oceanfront:'#5a5048', Financial:'#2a3550', Industrial:'#3a342c',
      'Marina Bay':'#344048', Suburbs:'#4a4838', Entertainment:'#4a2030', Shopping:'#484038', Residential:'#484038',
    };
    return map[d] || '#333';
  }
}
