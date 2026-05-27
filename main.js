// ===================================================
//   THEME COLORS — read by all simulations
// ===================================================
function getThemeColors() {
  const dark = document.body.classList.contains('dark-mode');
  return {
    dark,
    bg:        dark ? '#264941' : '#E4E4DE',
    text:      dark ? '#e8e6d9' : '#1B1B1B',
    muted:     dark ? '#a8b8b2' : '#5a5a55',
    green:     dark ? '#8fd4a0' : 'rgb(58,105,66)',
    greenRgb:  dark ? '143,212,160' : '58,105,66',
    rod:       dark ? '#e8e6d9' : '#1B1B1B',
    traceBase: dark ? '232,230,217' : '196,197,186',
    springWire: dark ? '#5a8a78' : '#C4C5BA',
    springLabel: dark ? '#e8e6d9' : '#1B1B1B',
    attractorTrail: dark ? '180,218,195' : '100,101,94',
    attractorDot: dark ? 'rgba(143,212,160,0.9)' : 'rgba(58,105,66,0.85)',
    attractorEq:  dark ? 'rgba(180,218,195,0.22)' : 'rgba(155,157,146,0.28)',
  };
}

// ===================================================
//   RUCKLIDGE ATTRACTOR  — hero background
// ===================================================
(function () {
  const ac   = document.getElementById("attractor-canvas");
  if (!ac) return;
  const actx = ac.getContext("2d");

  const KAPPA  = 2.0;
  const LAMBDA = 6.7;
  const DT     = 0.0015;

  const TRAIL_LEN = 6000; 
  const trail = Array.from({ length: TRAIL_LEN }, () => ({ x: 0, y: 0, z: 0 }));
  let trailCount = 0;
  let headIndex = 0;

  let rx = 0.1, ry = 0.0, rz = 0.0;

  for (let i = 0; i < 5000; i++) {
    const dx = -KAPPA * rx + LAMBDA * ry - ry * rz;
    const dy =  rx;
    const dz = -rz + ry * ry;
    rx += dx * DT;  ry += dy * DT;  rz += dz * DT;
  }

  function project(x, y, z, cx, cy, scale) {
    const px =  x * 0.85 - y * 0.30;
    const py = -z * 0.90 + x * 0.18 + y * 0.08;
    return { sx: cx + px * scale, sy: cy + py * scale };
  }

  function resizeAttractor() {
    const dpr = window.devicePixelRatio || 1;
    const parent = ac.parentElement;
    const W = parent.offsetWidth  || window.innerWidth;
    const H = parent.offsetHeight || 400;
    ac.width  = Math.round(W * dpr);
    ac.height = Math.round(H * dpr);
    ac.style.width  = W + "px";
    ac.style.height = H + "px";
    actx.setTransform(0.5, 0, 0, 0.5, 200, 700);
    actx.scale(dpr, dpr);
  }

  if (document.readyState === "complete") {
    resizeAttractor();
  } else {
    window.addEventListener("load", resizeAttractor, { once: true });
  }
  setTimeout(resizeAttractor, 100);
  setTimeout(resizeAttractor, 500);
  window.addEventListener("resize", resizeAttractor);

  const STEPS_PER_FRAME = 20;

  function attractorLoop() {
    for (let s = 0; s < STEPS_PER_FRAME; s++) {
      const dx = -KAPPA * rx + LAMBDA * ry - ry * rz;
      const dy =  rx;
      const dz = -rz + ry * ry;
      rx += dx * DT;  ry += dy * DT;  rz += dz * DT;

      trail[headIndex] = { x: rx, y: ry, z: rz };
      headIndex = (headIndex + 1) % TRAIL_LEN;
      if (trailCount < TRAIL_LEN) trailCount++;
    }

    const W = ac.clientWidth;
    const H = ac.clientHeight;

    if (W === 0 || H === 0) {
      requestAnimationFrame(attractorLoop);
      return;
    }

    actx.save();
    actx.setTransform(1, 0, 0, 1, 0, 0);
    actx.clearRect(0, 0, ac.width, ac.height);
    actx.restore();

    const cx    = W * 0.68;
    const cy    = H * 0.50;
    const scale = Math.min(W, H) * 0.11;
    const C     = getThemeColors();

    if (trailCount > 1) {
      actx.lineWidth = 1.4;
      actx.lineCap   = "round";
      
      let startIndex = trailCount < TRAIL_LEN ? 0 : headIndex;

      for (let i = 1; i < trailCount; i += 2) {
        const idx0 = (startIndex + i - 1) % TRAIL_LEN;
        const idx1 = (startIndex + i) % TRAIL_LEN;
        
        const t = i / trailCount;
        const alpha = t * t * 0.72; 

        const p0 = project(trail[idx0].x, trail[idx0].y, trail[idx0].z, cx, cy, scale);
        const p1 = project(trail[idx1].x, trail[idx1].y, trail[idx1].z, cx, cy, scale);

        actx.beginPath();
        actx.strokeStyle = `rgba(${C.attractorTrail}, ${alpha.toFixed(3)})`;
        actx.moveTo(p0.sx, p0.sy);
        actx.lineTo(p1.sx, p1.sy);
        actx.stroke();
      }
    }

    const hp = project(rx, ry, rz, cx, cy, scale);
    actx.beginPath();
    actx.arc(hp.sx, hp.sy, 4, 0, Math.PI * 2);
    actx.fillStyle = C.attractorDot;
    actx.fill();

    const eq = project(0, 1.5, 4.0, cx, cy, scale);
    actx.save();
    actx.setTransform(1, 0, 0, 1, 0, 0);
    actx.font = "italic 30px Georgia, serif";
    actx.fillStyle = C.attractorEq;
    actx.textAlign = "left";
    actx.textBaseline = "top";
    actx.fillText("ẋ = −κx + λy − yz", eq.sx + 250, eq.sy + 800);
    actx.fillText("ẏ = x",              eq.sx + 250, eq.sy + 32 + 800);
    actx.fillText("ż = −z + y²",        eq.sx + 250, eq.sy + 64 + 800);
    actx.restore();

    requestAnimationFrame(attractorLoop);
  }

  requestAnimationFrame(attractorLoop);
})();

// ===================================================
//   PENDULUM & ROPE SECTION (WITH LETTER COLLISIONS)
// ===================================================
const canvas = document.getElementById("pendulums");
const ctx    = canvas.getContext("2d");

const g              = 9.81;
const MTP            = 200; 
const dt             = 1 / 60;
const DRAG_RADIUS    = 22;
const PHYS_SUB_STEPS = 4;
const FRAME_DAMPING = 0.999; 

// collision radius for the letters
const LETTER_COLLID_RADIUS = 12;

// randomly decide which mode is used (rope or pendulum) 
const useRopeMode = Math.random() < 0.5;

// --- mode 1 - double pendulum ---
class DoublePendulum {
  constructor(origin, L1, L2, m1, m2, theta1, theta2, color = "#1B1B1B") {
    Object.assign(this, { origin, L1, L2, m1, m2, theta1, theta2, color });
    this.omega1 = 0; this.omega2 = 0;
    this.trace = []; 
    this.isDragging = false;       
    this.isDraggingJoint = false;  
    this.isHoveredLetter = false;
    this.isHoveredJoint = false;
    this.letter = "";
    this._prevDragX = null; this._prevDragY = null;
    this._cursorVX = 0; this._cursorVY = 0;
    this._prevJointX = null; this._prevJointY = null;
    this._jointAX = 0; this._jointAY = 0;

    // Breaking State System
    this.isBroken = false;
    this.respawnTimer = 0;
    this.particles = [];
  }

  // returns the letter's velocity
  getVelocity() {
    const L1px = this.L1 * MTP;
    const L2px = this.L2 * MTP;
    const vx = this.omega1 * L1px * Math.cos(this.theta1) + this.omega2 * L2px * Math.cos(this.theta2);
    const vy = -this.omega1 * L1px * Math.sin(this.theta1) - this.omega2 * L2px * Math.sin(this.theta2);
    return { vx, vy };
  }

  applyImpulse(ix, iy) {
    const L2px = this.L2 * MTP;
    const torque = ix * Math.cos(this.theta2) - iy * Math.sin(this.theta2);
    this.omega2 += (torque / L2px) * 0.15;
  }

  // breaks the letter into small letter particles
	breakLetter(dirX = 0, dirY = 0, impactSpeed = 0) {
	  if (this.isBroken) return;
	  this.isBroken = true;
	  this.respawnTimer = 180; 
	  this.particles = [];
	  
	  const bob2 = this.getBob2();
	  const baseVel = this.getVelocity();
	  const pushX = dirX * impactSpeed * 0.2;
	  const pushY = dirY * impactSpeed * 0.2;

	  for (let i = 0; i < 12; i++) {
		this.particles.push({
		  x: bob2.x,
		  y: bob2.y,
		  // Combine baseline velocity with the explosive direction of the crash impact
		  vx: baseVel.vx * 0.1 + pushX + (Math.random() - 0.5) * 150,
		  vy: baseVel.vy * 0.1 + pushY + (Math.random() - 0.5) * 150 - 30, 
		  angle: Math.random() * Math.PI * 2,
		  va: (Math.random() - 0.5) * 0.3,
		  scale: 0.4 + Math.random() * 0.5,
		  alpha: 1.0
		});
	  }
	}

  update() {
    if (this.isBroken) {
      this.respawnTimer--;
      if (this.respawnTimer <= 0) {
        this.isBroken = false;
        this.particles = [];
      } else {
        this.particles.forEach(p => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 320 * dt; 
          p.angle += p.va;
          p.alpha -= 0.007;
          if (p.alpha < 0) p.alpha = 0;
        });
      }
    }

    if (this.isDragging) { 
      this.omega1 = this.omega2 = 0; 
      return; 
    }

    const subDt = dt / PHYS_SUB_STEPS;
    const subDamping = FRAME_DAMPING ** (1 / PHYS_SUB_STEPS); 
    const { m1, m2, L1, L2 } = this;

    if (this.isDraggingJoint) {
      const b1 = this.getBob1();
      if (this._prevJointX !== null) {
        const vx = (b1.x - this._prevJointX) / MTP / dt;
        const vy = (b1.y - this._prevJointY) / MTP / dt;
        this._jointAX = vx / dt;
        this._jointAY = vy / dt;
      }
      this._prevJointX = b1.x;
      this._prevJointY = b1.y;
    } else {
      this._prevJointX = null; this._prevJointY = null;
      this._jointAX = 0; this._jointAY = 0;
    }

    for (let i = 0; i < PHYS_SUB_STEPS; i++) {
      if (this.isDraggingJoint) {
        this.omega1 = 0;
        const eff_gx = -this._jointAX * 0.12; 
        const eff_gy = g - this._jointAY * 0.12;
        const a2 = (-eff_gy * Math.sin(this.theta2) + eff_gx * Math.cos(this.theta2)) / L2;
        this.omega2 = (this.omega2 + a2 * subDt) * subDamping;
        this.theta2 += this.omega2 * subDt;
      } else {
        const delta = this.theta1 - this.theta2;
        const sinD = Math.sin(delta);
        const cosD = Math.cos(delta);
        const denom = 2 * m1 + m2 - m2 * Math.cos(2 * delta);
        
        const a1 = (-g * (2 * m1 + m2) * Math.sin(this.theta1) - m2 * g * Math.sin(this.theta1 - 2 * this.theta2)
                   - 2 * sinD * m2 * (this.omega1 ** 2 * L1 * cosD + this.omega2 ** 2 * L2)) / (L1 * denom);
        const a2 = (2 * sinD * (this.omega1 ** 2 * L1 * (m1 + m2) + g * (m1 + m2) * Math.cos(this.theta1)
                   + this.omega2 ** 2 * L2 * m2 * cosD)) / (L2 * denom);
        
        this.omega1 = (this.omega1 + a1 * subDt) * subDamping;
        this.omega2 = (this.omega2 + a2 * subDt) * subDamping;
        this.theta1 += this.omega1 * subDt;
        this.theta2 += this.omega2 * subDt;
      }
    }

    this.trace.push(this.getBob2());
    if (this.trace.length > 300) this.trace.shift();
  }

  getBob1() { return { x: this.origin.x + this.L1*MTP*Math.sin(this.theta1), y: this.origin.y + this.L1*MTP*Math.cos(this.theta1) }; }
  getBob2() { const b1 = this.getBob1(); return { x: b1.x + this.L2*MTP*Math.sin(this.theta2), y: b1.y + this.L2*MTP*Math.cos(this.theta2) }; }

  drawTrace(ctx) {
    if (this.trace.length > 1) {
      const C = getThemeColors();
      ctx.save(); ctx.lineWidth = 1.2;
      for (let i = 1; i < this.trace.length; i++) {
        const t = i / this.trace.length; 
        const alpha = t > 0.25 ? 0.45 : (t / 0.25) * 0.45;
        ctx.strokeStyle = `rgba(${C.traceBase}, ${alpha.toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(this.trace[i - 1].x, this.trace[i - 1].y); ctx.lineTo(this.trace[i].x, this.trace[i].y); ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawPendulum(ctx) {
    const bob1 = this.getBob1(), bob2 = this.getBob2();
    const C = getThemeColors();
    
    ctx.strokeStyle = C.rod; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(this.origin.x, this.origin.y); ctx.lineTo(bob1.x, bob1.y); ctx.lineTo(bob2.x, bob2.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(this.origin.x, this.origin.y, 4, 0, Math.PI*2); ctx.fillStyle = C.rod; ctx.fill();

    ctx.beginPath(); ctx.arc(bob1.x, bob1.y, 5, 0, Math.PI*2); 
    ctx.fillStyle = (this.isHoveredJoint || this.isDraggingJoint) ? C.green : C.rod; 
    ctx.fill();
    
    if (!this.isBroken) {
      const angle = Math.atan2(bob2.x-bob1.x, bob2.y-bob1.y);
      ctx.save(); ctx.translate(bob2.x, bob2.y); ctx.rotate(angle + Math.PI); ctx.scale(-1,-1);
      ctx.fillStyle = (this.isHoveredLetter || this.isDragging) ? C.green : C.text;
      ctx.font = "bold 32px Helvetica"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(this.letter, 0, 0); ctx.restore();
    } else {
      ctx.save();
      this.particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.scale(p.scale, p.scale);
        ctx.fillStyle = `rgba(${C.greenRgb}, ${p.alpha})`;
        ctx.font = "bold 32px Helvetica"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(this.letter, 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }
  }

  dragJointTo(x, y) {
    if (this._prevDragX !== null) {
      const alpha = 0.6;
      this._cursorVX = alpha * (x - this._prevDragX) + (1 - alpha) * this._cursorVX;
      this._cursorVY = alpha * (y - this._prevDragY) + (1 - alpha) * this._cursorVY;
    }
    this._prevDragX = x; this._prevDragY = y;
    const dx = x - this.origin.x;
    const dy = y - this.origin.y;
    this.theta1 = Math.atan2(dx, dy);
  }

  dragTo(x, y) {
    if (this._prevDragX !== null) {
      const alpha = 0.6;
      this._cursorVX = alpha * (x - this._prevDragX) + (1 - alpha) * this._cursorVX;
      this._cursorVY = alpha * (y - this._prevDragY) + (1 - alpha) * this._cursorVY;
    }
    this._prevDragX = x; this._prevDragY = y;

    const { x:ox, y:oy } = this.origin;
    const L1px = this.L1*MTP, L2px = this.L2*MTP;
    const dx = x-ox, dy = y-oy, dist = Math.hypot(dx,dy);
    const d = Math.max(Math.abs(L1px-L2px)+0.01, Math.min(dist, L1px+L2px-0.01));
    const aim = Math.atan2(dx,dy);
    const cosA = (L1px**2+L2px**2-d**2)/(2*L1px*L2px);
    const th2Off = Math.PI - Math.acos(Math.min(1,Math.max(-1,cosA)));
    const cosB = (L1px**2+d**2-L2px**2)/(2*L1px*d);
    const angB = Math.acos(Math.min(1,Math.max(-1,cosB)));
    const norm = a => { while(a>Math.PI) a-=2*Math.PI; while(a<-Math.PI) a+=2*Math.PI; return a; };
    const try1 = t1 => { const x1=ox+L1px*Math.sin(t1),y1=oy+L1px*Math.cos(t1),t2=norm(t1-th2Off); return {t1,t2,x2:x1+L2px*Math.sin(t2),y2:y1+L2px*Math.cos(t2)}; };
    const solA=try1(aim+angB), solB=try1(aim-angB);
    const best = Math.hypot(solA.x2-x,solA.y2-y)<Math.hypot(solB.x2-x,solB.y2-y)?solA:solB;
    this.theta1=norm(best.t1); this.theta2=norm(best.t2); this.omega1=this.omega2=0;
  }

  releaseWithMomentum() {
    const vx = this._cursorVX; const vy = this._cursorVY;
    if (Math.hypot(vx, vy) > 0.5) {
      const L1px = this.L1 * MTP; const L2px = this.L2 * MTP;
      const t1x = Math.cos(this.theta1), t1y = -Math.sin(this.theta1);
      const t2x = Math.cos(this.theta2), t2y = -Math.sin(this.theta2);
      const MAX_OMEGA = 4;
      if (this.isDraggingJoint) {
        this.omega1 = Math.max(-MAX_OMEGA, Math.min(MAX_OMEGA, (vx * t1x + vy * t1y) / L1px / dt * 0.4));
      } else if (this.isDragging) {
        this.omega1 = Math.max(-MAX_OMEGA, Math.min(MAX_OMEGA, (vx * t1x + vy * t1y) / L1px / dt * 0.35));
        this.omega2 = Math.max(-MAX_OMEGA, Math.min(MAX_OMEGA, (vx * t2x + vy * t2y) / L2px / dt * 0.35));
      }
    }
    this._prevDragX = null; this._prevDragY = null; this._cursorVX = 0; this._cursorVY = 0;
  }
}

// --- mode 2 - rope ---
class ElasticRope {
  constructor(origin, totalLength, letter) {
    this.origin = origin;
    this.letter = letter;
    
    this.numNodes = 24; 
    this.totalLength = totalLength;
    this.segmentLength = totalLength / (this.numNodes - 1);
    
    this.nodes = [];
    for (let i = 0; i < this.numNodes; i++) {
      this.nodes.push({
        x: origin.x,
        y: origin.y + i * this.segmentLength,
        oldX: origin.x,
        oldY: origin.y + i * this.segmentLength
      });
    }

    this.trace = [];
    this.isDragging = false;
    this.isDraggingJoint = false; 
    this.isHoveredLetter = false;
    this.isHoveredJoint = false;
    this._prevDragX = null; this._prevDragY = null;
    this._cursorVX = 0; this._cursorVY = 0;
    this._stretchForceX = 0; this._stretchForceY = 0;

    this.stiffness = 0.95;
    this.gravity = 0.55;
    this.damping = 0.994;

    // Breaking State System
    this.isBroken = false;
    this.respawnTimer = 0;
    this.particles = [];
  }

  getVelocity() {
    const endNode = this.getBob2();
    return {
      vx: (endNode.x - endNode.oldX) / dt,
      vy: (endNode.y - endNode.oldY) / dt
    };
  }

  applyImpulse(ix, iy) {
    const endNode = this.getBob2();
    if (!this.isDragging) {
      endNode.x += ix * dt * 0.15;
      endNode.y += iy * dt * 0.15;
    }
  }

	breakLetter(dirX = 0, dirY = 0, impactSpeed = 0) {
	  if (this.isBroken) return;
	  this.isBroken = true;
	  this.respawnTimer = 180; 
	  this.particles = [];
	  
	  const bob2 = this.getBob2();
	  const baseVel = this.getVelocity();
	  const pushX = dirX * impactSpeed * 0.2;
	  const pushY = dirY * impactSpeed * 0.2;

	  for (let i = 0; i < 12; i++) {
		this.particles.push({
		  x: bob2.x,
		  y: bob2.y,
		  vx: baseVel.vx * 0.1 + pushX + (Math.random() - 0.5) * 150,
		  vy: baseVel.vy * 0.1 + pushY + (Math.random() - 0.5) * 150 - 30,
		  angle: Math.random() * Math.PI * 2,
		  va: (Math.random() - 0.5) * 0.3,
		  scale: 0.4 + Math.random() * 0.5,
		  alpha: 1.0
		});
	  }
	}

  resetNodes() {
	  for (let i = 0; i < this.numNodes; i++) {
		this.nodes[i].x = this.origin.x;
		this.nodes[i].y = this.origin.y + i * this.segmentLength;
		this.nodes[i].oldX = this.nodes[i].x;
		this.nodes[i].oldY = this.nodes[i].y;
	  }
	}

  update() {
    if (this.isBroken) {
      this.respawnTimer--;
      if (this.respawnTimer <= 0) {
        this.isBroken = false;
        this.particles = [];
      } else {
        this.particles.forEach(p => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 320 * dt;
          p.angle += p.va;
          p.alpha -= 0.007;
          if (p.alpha < 0) p.alpha = 0;
        });
      }
    }

    this.nodes[0].x = this.origin.x;
    this.nodes[0].y = this.origin.y;

    for (let i = 1; i < this.numNodes; i++) {
      if (i === this.numNodes - 1 && this.isDragging) continue;

      let n = this.nodes[i];
      let vx = (n.x - n.oldX) * this.damping;
      let vy = (n.y - n.oldY) * this.damping;

      n.oldX = n.x; n.oldY = n.y;
      n.x += vx;
      n.y += vy + this.gravity;
    }

    for (let iter = 0; iter < 12; iter++) {
      for (let i = 0; i < this.numNodes - 1; i++) {
        let n1 = this.nodes[i];
        let n2 = this.nodes[i+1];

        let dx = n2.x - n1.x;
        let dy = n2.y - n1.y;
        let dist = Math.hypot(dx, dy) || 0.1;
        
        let diff = this.segmentLength - dist;
        let correction = (diff / dist) * 0.5 * this.stiffness;
        let offsetX = dx * correction;
        let offsetY = dy * correction;

        if (i > 0) {
          n1.x -= offsetX; n1.y -= offsetY;
        }
        if (!(i + 1 === this.numNodes - 1 && this.isDragging)) {
          n2.x += offsetX; n2.y += offsetY;
        }
      }
      this.nodes[0].x = this.origin.x; this.nodes[0].y = this.origin.y;
    }

    this.trace.push({ x: this.getBob2().x, y: this.getBob2().y });
    if (this.trace.length > 300) this.trace.shift();
  }

  getBob1() { return { x: -9999, y: -9999 }; } 
  getBob2() { return this.nodes[this.numNodes - 1]; }

  drawTrace(ctx) {
    if (this.trace.length > 1) {
      const C = getThemeColors();
      ctx.save(); ctx.lineWidth = 1.2;
      for (let i = 1; i < this.trace.length; i++) {
        const t = i / this.trace.length; 
        const alpha = t > 0.25 ? 0.45 : (t / 0.25) * 0.45;
        ctx.strokeStyle = `rgba(${C.traceBase}, ${alpha.toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(this.trace[i - 1].x, this.trace[i - 1].y); ctx.lineTo(this.trace[i].x, this.trace[i].y); ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawPendulum(ctx) {
    const C = getThemeColors();
    ctx.strokeStyle = C.rod; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
    for (let i = 1; i < this.numNodes; i++) {
      ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
    }
    ctx.stroke();
    
    ctx.beginPath(); ctx.arc(this.nodes[0].x, this.nodes[0].y, 4, 0, Math.PI*2); ctx.fillStyle = C.rod; ctx.fill();
    
    const bob2 = this.getBob2();
    if (!this.isBroken) {
      const prevBob = this.nodes[this.numNodes - 2];
      const angle = Math.atan2(bob2.x - prevBob.x, bob2.y - prevBob.y);
      
      ctx.save(); ctx.translate(bob2.x, bob2.y); ctx.rotate(angle + Math.PI); ctx.scale(-1,-1);
      ctx.fillStyle = (this.isHoveredLetter || this.isDragging) ? C.green : C.text;
      ctx.font = "bold 32px Helvetica"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(this.letter, 0, 0); ctx.restore();
    } else {
      ctx.save();
      this.particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.scale(p.scale, p.scale);
        ctx.fillStyle = `rgba(${C.greenRgb}, ${p.alpha})`;
        ctx.font = "bold 32px Helvetica"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(this.letter, 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }
  }

  dragTo(x, y) {
    if (this._prevDragX !== null) {
      const alpha = 0.6;
      this._cursorVX = alpha * (x - this._prevDragX) + (1 - alpha) * this._cursorVX;
      this._cursorVY = alpha * (y - this._prevDragY) + (1 - alpha) * this._cursorVY;
    }
    this._prevDragX = x; this._prevDragY = y;

    const dx = x - this.origin.x;
    const dy = y - this.origin.y;
    const currentDist = Math.hypot(dx, dy) || 0.1;
    
    // this is the allowed tolerance while dragging the letter (1.5x the rope length)
    const maxAllowedDist = this.totalLength * 1.5;
    if (currentDist > maxAllowedDist) {
      x = this.origin.x + (dx / currentDist) * maxAllowedDist;
      y = this.origin.y + (dy / currentDist) * maxAllowedDist;
    }

    const endNode = this.getBob2();
    endNode.x = x;
    endNode.y = y;

    this._stretchForceX = 0; this._stretchForceY = 0;
  }

  releaseWithMomentum() {
    if (this.isDragging) {
      const endNode = this.getBob2();
      const flingX = (this._cursorVX * 0.35);
      const flingY = (this._cursorVY * 0.35);
      
      if (Math.hypot(flingX, flingY) > 0.2) {
        endNode.oldX = endNode.x - flingX;
        endNode.oldY = endNode.y - flingY;
      }
    }
    this._prevDragX = null; this._prevDragY = null; 
    this._cursorVX = 0; this._cursorVY = 0;
    this._stretchForceX = 0; this._stretchForceY = 0;
  }
}

const isMobile = window.matchMedia("(max-width: 768px)").matches;
const word1 = "noah", word2 = isMobile ? "" : "horne";

function makePendulums(word) {
  return word.split("").map(letter => {
    if (useRopeMode) {
      const totalLen = (0.7 + Math.random() * 0.15) * MTP;
      return new ElasticRope({x:0,y:0}, totalLen, letter);
    } else {
      const dp = new DoublePendulum({x:0,y:0}, 0.6, 0.2+Math.random()*0.1, 1, 1,
        0.1*(Math.random()*0.4+0.05), 0.1*(Math.random()*0.4+0.05), "#1B1B1B");
      dp.letter = letter; return dp;
    }
  });
}
const pendulums = [...makePendulums(word1), ...makePendulums(word2)];

// --- colision system ---
function handleLetterCollisions() {
  const len = pendulums.length;
  const minDist = LETTER_COLLID_RADIUS * 2;

  for (let i = 0; i < len; i++) {
    for (let j = i + 1; j < len; j++) {
      const p1 = pendulums[i];
      const p2 = pendulums[j];

      if (p1.isBroken || p2.isBroken) continue;

      const b1 = p1.getBob2();
      const b2 = p2.getBob2();

      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const distance = Math.hypot(dx, dy);

      if (distance < minDist && distance > 0.1) {
        const overlap = minDist - distance;
        const nx = dx / distance;
        const ny = dy / distance;

        
        if (p1.isDragging) {
          if (!p2.isDragging) { 
            b2.x += nx * overlap; b2.y += ny * overlap; 
            if (p2.nodes) { b2.oldX += nx * overlap; b2.oldY += ny * overlap; }
          }
        } else if (p2.isDragging) {
          if (!p1.isDragging) { 
            b1.x -= nx * overlap; b1.y -= ny * overlap; 
            if (p1.nodes) { b1.oldX -= nx * overlap; b1.oldY -= ny * overlap; }
          }
        } else {
          b1.x -= nx * overlap * 0.5; b1.y -= ny * overlap * 0.5;
          b2.x += nx * overlap * 0.5; b2.y += ny * overlap * 0.5;
          if (p1.nodes) { b1.oldX -= nx * overlap * 0.5; b1.oldY -= ny * overlap * 0.5; }
          if (p2.nodes) { b2.oldX += nx * overlap * 0.5; b2.oldY += ny * overlap * 0.5; }
        }

        const v1 = p1.getVelocity();
        const v2 = p2.getVelocity();

        const rvx = v2.vx - v1.vx;
        const rvy = v2.vy - v1.vy;
        const velAlongNormal = rvx * nx + rvy * ny;

        if (velAlongNormal < 0) {
          const restitution = 0.75; 
          const impulseScalar = -(1 + restitution) * velAlongNormal;

          const impulseX = nx * impulseScalar * 0.5;
          const impulseY = ny * impulseScalar * 0.5;

          p1.applyImpulse(-impulseX, -impulseY);
          p2.applyImpulse(impulseX, impulseY);

          // This stops physics explosions when manually shoving letters into things
          if (!p1.isDragging && !p2.isDragging) {
            const BREAK_THRESHOLD_SPEED = 950; 
            if (Math.abs(velAlongNormal) > BREAK_THRESHOLD_SPEED) {
              p1.breakLetter(-nx, -ny, Math.abs(velAlongNormal));
              p2.breakLetter(nx, ny, Math.abs(velAlongNormal));
            }
          }
        }
      }
    }
  }
}

function alignPendulums() {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const spacing = 60, gap = 130;
  const oy = H * 0.12;
  const g1L = word1.length, g2L = word2.length;
  const w1 = (g1L-1)*spacing, w2 = (g2L-1)*spacing;
  
  const setupPositions = (p, x, y) => {
    p.origin.x = x; 
    p.origin.y = y; 
    p.trace.length = 0;
    if (typeof p.resetNodes === "function") {
      p.resetNodes();
    }
  };

  if (g2L === 0) {
    const sx = W/2 - w1/2;
    pendulums.slice(0,g1L).forEach((p,i)=>{ setupPositions(p, sx+i*spacing, oy); });
  } else {
    const total = w1+w2+gap, sx = W/2 - total/2;
    pendulums.slice(0,g1L).forEach((p,i)=>{ setupPositions(p, sx+i*spacing, oy); });
    pendulums.slice(g1L).forEach((p,i)=>{ setupPositions(p, sx+w1+gap+i*spacing, oy); });
  }
}

let pendulumResizeTimeout;
function resizePendulumCanvas() {
  const dpr = window.devicePixelRatio||1;
  canvas.width = window.innerWidth*dpr;
  canvas.height = 295*dpr;
  canvas.style.width = window.innerWidth+"px";
  canvas.style.height = "295px";
  ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);
  
  clearTimeout(pendulumResizeTimeout);
  pendulumResizeTimeout = setTimeout(() => {
    alignPendulums();
  }, 120);
}
window.addEventListener("resize", resizePendulumCanvas);
resizePendulumCanvas();

let draggingPendulum = null;
function getCanvasPos(e) { const r=canvas.getBoundingClientRect(),src=e.touches?e.touches[0]:e; return {x:src.clientX-r.left,y:src.clientY-r.top}; }

canvas.addEventListener("mousedown", e=>{ 
  const{x,y}=getCanvasPos(e); 
  for(const p of pendulums){
    const b1 = p.getBob1();
    if(Math.hypot(x - b1.x, y - b1.y) < DRAG_RADIUS) {
      draggingPendulum = p; p.isDraggingJoint = true; p.trace.length = 0;
      p._prevDragX=null; p._prevDragY=null; p._cursorVX=0; p._cursorVY=0;
      if (p.dragJointTo) p.dragJointTo(x, y);
      break;
    }
    const b2 = p.getBob2(); 
    if(Math.hypot(x-b2.x,y-b2.y)<DRAG_RADIUS){
      draggingPendulum=p; p.isDragging=true; p.trace.length = 0; 
      p._prevDragX=null; p._prevDragY=null; p._cursorVX=0; p._cursorVY=0;
      p.dragTo(x,y);
      break;
    }
  } 
});

canvas.addEventListener("mousemove", e=>{ 
  const{x,y}=getCanvasPos(e); 
  if(draggingPendulum) {
    if(draggingPendulum.isDraggingJoint && draggingPendulum.dragJointTo) {
      draggingPendulum.dragJointTo(x, y);
    } else if(draggingPendulum.isDragging) {
      draggingPendulum.dragTo(x, y);
    }
  }
  
  for(const p of pendulums) {
    const hoverJoint = Math.hypot(x - p.getBob1().x, y - p.getBob1().y) < DRAG_RADIUS;
    const hoverLetter = Math.hypot(x - p.getBob2().x, y - p.getBob2().y) < DRAG_RADIUS;
    
    if (hoverJoint) {
      p.isHoveredJoint = true; p.isHoveredLetter = false;
    } else if (hoverLetter) {
      p.isHoveredJoint = false; p.isHoveredLetter = true;
    } else {
      p.isHoveredJoint = false; p.isHoveredLetter = false;
    }
  }
});

canvas.addEventListener("mouseup", ()=>{ 
  if(draggingPendulum){
    draggingPendulum.releaseWithMomentum();
    draggingPendulum.isDragging = false; draggingPendulum.isDraggingJoint = false; draggingPendulum=null;
  } 
});
canvas.addEventListener("mouseleave", ()=>{ 
  if(draggingPendulum){
    draggingPendulum.releaseWithMomentum();
    draggingPendulum.isDragging = false; draggingPendulum.isDraggingJoint = false; draggingPendulum=null;
  } 
  pendulums.forEach(p=>{ p.isHoveredJoint=false; p.isHoveredLetter=false; }); 
});

canvas.addEventListener("touchstart",e=>{
  e.preventDefault(); const{x,y}=getCanvasPos(e);
  for(const p of pendulums){
    const b1 = p.getBob1();
    if(Math.hypot(x - b1.x, y - b1.y) < DRAG_RADIUS) {
      draggingPendulum = p; p.isDraggingJoint = true; p.trace.length = 0;
      p._prevDragX=null; p._prevDragY=null; p._cursorVX=0; p._cursorVY=0;
      if (p.dragJointTo) p.dragJointTo(x, y);
      break;
    }
    const b2 = p.getBob2();
    if(Math.hypot(x-b2.x,y-b2.y)<DRAG_RADIUS){
      draggingPendulum=p; p.isDragging=true; p.trace.length = 0; 
      p._prevDragX=null; p._prevDragY=null; p._cursorVX=0; p._cursorVY=0; p.dragTo(x,y);
      break;
    }
  }
},{passive:false});

canvas.addEventListener("touchmove",e=>{
  e.preventDefault();
  if(draggingPendulum){
    const {x,y}=getCanvasPos(e);
    if(draggingPendulum.isDraggingJoint && draggingPendulum.dragJointTo) {
      draggingPendulum.dragJointTo(x, y);
    } else if(draggingPendulum.isDragging) {
      draggingPendulum.dragTo(x, y);
    }
  }
},{passive:false});

canvas.addEventListener("touchend",e=>{
  e.preventDefault();
  if(draggingPendulum){
    draggingPendulum.releaseWithMomentum();
    draggingPendulum.isDragging = false; draggingPendulum.isDraggingJoint = false; draggingPendulum=null;
  }
},{passive:false});

let initFrames = 0;
const FRAMES_TO_WAIT = 5; // Wait 5 frames (~80ms) for DOM layout & resizing to settle (to circumvent random letter explosions)

function pendulumLoop() {
  if (initFrames < FRAMES_TO_WAIT) {
    initFrames++;
    alignPendulums(); 
    requestAnimationFrame(pendulumLoop);
    return;
  }

  // 2. Normal loop begins once initialized
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Update positions
  pendulums.forEach(p => p.update());
  
  // Handle collisions and impulse logic
  handleLetterCollisions();
  
  // Render
  pendulums.forEach(p => p.drawTrace(ctx));
  pendulums.forEach(p => p.drawPendulum(ctx));
  
  requestAnimationFrame(pendulumLoop);
}
requestAnimationFrame(pendulumLoop);

// ===================================================
//   SPRING HEADER — shared class
// ===================================================
class SpringHeader {
  constructor(canvasId, label, icon = "\u21C6") {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx    = this.canvas.getContext("2d");
    this.label  = label; this.icon = icon;
    this.massX = 0; this.massY = 0; this.massVX = 0;
    this.dragging = false; this.dragOffset = 0;
    this._k = 0.0025; this._damp = 0.015; this._mass = 1.0;
    this._resize();
    window.addEventListener("resize", ()=>this._resize());
    this._bindEvents();
  }

  _resize() {
    const dpr = window.devicePixelRatio||1;
    const w = this.canvas.parentElement.clientWidth, h = 120;
    this.canvas.width = w*dpr; this.canvas.height = h*dpr;
    this.canvas.style.width = w+"px"; this.canvas.style.height = h+"px";
    this.ctx.setTransform(1,0,0,1,0,0); this.ctx.scale(dpr,dpr);
    this.massY = h/2;
    if (!this.massX) this.massX = w/2;
  }

  _anchors() { return { left:-60, right: this.canvas.clientWidth+60 }; }

  _drawZigzag(x1,y1,x2,y2,coils=20,amp=8) {
    const step=(x2-x1)/(coils*2);
    this.ctx.beginPath(); this.ctx.moveTo(x1,y1);
    for(let i=0;i<coils*2;i++) this.ctx.lineTo(x1+step*(i+1), y1+(i%2===0?-amp:amp));
    this.ctx.lineTo(x2,y2); this.ctx.stroke();
  }

  update() {
    if(this.dragging) return;
    const{left,right}=this._anchors(), rest=(left+right)/2;
    const disp=this.massX-rest;
    this.massVX += (-this._k*disp*2)/this._mass;
    this.massVX *= (1-this._damp);
    this.massX  += this.massVX;
  }

  draw() {
    const ctx=this.ctx, W=this.canvas.clientWidth, H=this.canvas.clientHeight;
    const C = getThemeColors();
    ctx.clearRect(0,0,W,H);
    const{left,right}=this._anchors(), hw=110;
    ctx.strokeStyle = C.springWire; ctx.lineWidth=3;
    this._drawZigzag(left,this.massY,this.massX-hw,this.massY);
    this._drawZigzag(right,this.massY,this.massX+hw,this.massY);
    ctx.fillStyle = C.green; ctx.font="bold 56px Helvetica";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(this.icon, this.massX, this.massY-36);
    ctx.fillStyle = C.springLabel; ctx.font="bold 46px Helvetica";
    ctx.fillText(this.label, this.massX, this.massY+6);
  }

  _getX(e) { const r=this.canvas.getBoundingClientRect(); return (e.touches?e.touches[0].clientX:e.clientX)-r.left; }
  _hitTest(x,y) { return Math.abs(x-this.massX)<110 && Math.abs(y-this.massY)<44; }

  _bindEvents() {
    const c=this.canvas;
    c.addEventListener("mousedown",e=>{const x=this._getX(e),y=e.clientY-c.getBoundingClientRect().top; if(this._hitTest(x,y)){this.dragging=true;this.dragOffset=x-this.massX;}});
    c.addEventListener("mousemove",e=>{if(this.dragging){this.massX=this._getX(e)-this.dragOffset;this.massVX=0;}});
    c.addEventListener("mouseup",()=>this.dragging=false);
    c.addEventListener("mouseleave",()=>this.dragging=false);
    c.addEventListener("touchstart",e=>{const x=this._getX(e),y=e.touches[0].clientY-c.getBoundingClientRect().top;if(this._hitTest(x,y)){this.dragging=true;this.dragOffset=x-this.massX;}},{passive:false});
    c.addEventListener("touchmove",e=>{if(this.dragging){this.massX=this._getX(e)-this.dragOffset;this.massVX=0;}},{passive:false});
    c.addEventListener("touchend",()=>this.dragging=false,{passive:false});
    c.addEventListener("touchcancel",()=>this.dragging=false,{passive:false});
  }
}

const aboutSpring = new SpringHeader("aboutSpringCanvas", "About Me");
const expSpring   = new SpringHeader("expSpringCanvas",   "Experience");
const workSpring  = new SpringHeader("workSpringCanvas",  "My Work");

function springLoop() {
  aboutSpring.update(); aboutSpring.draw();
  expSpring.update();   expSpring.draw();
  workSpring.update();  workSpring.draw();
  requestAnimationFrame(springLoop);
}
springLoop();


// ===================================================
//   SCROLL-IN ANIMATIONS for experience cards
// ===================================================
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = (entry.target.dataset.index||0) * 80;
      setTimeout(()=>entry.target.classList.add("visible"), delay);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(".exp-card").forEach(card=>observer.observe(card));


// ===================================================
//   GALLERY / LIGHTBOX
// ===================================================
let lbImages = [], lbIndex = 0;
const lightbox  = document.getElementById("lightbox");
const lbImg     = lightbox.querySelector(".lb-img");
const lbDots    = lightbox.querySelector(".lb-dots");
const lbPrev    = lightbox.querySelector(".lb-prev");
const lbNext    = lightbox.querySelector(".lb-next");
const lbClose   = lightbox.querySelector(".lb-close");
const lbBack    = lightbox.querySelector(".lightbox-backdrop");

document.querySelectorAll(".exp-gallery").forEach(container => {
  const images = JSON.parse(container.dataset.images || "[]");
  if (!images.length) return;
  const strip = document.createElement("div");
  strip.className = "gallery-strip";
  images.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src; img.alt = ""; img.className = "gallery-thumb";
    img.addEventListener("click", () => openLightbox(images, i));
    strip.appendChild(img);
  });
  container.replaceWith(strip);
});

function openLightbox(images, startIdx) {
  lbImages = images; lbIndex = startIdx;
  renderLightbox();
  lightbox.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.style.display = "none";
  document.body.style.overflow = "";
}

function renderLightbox() {
  lbImg.src = lbImages[lbIndex];
  lbDots.innerHTML = "";
  lbImages.forEach((_, i) => {
    const d = document.createElement("button");
    d.className = "lb-dot" + (i === lbIndex ? " active" : "");
    d.addEventListener("click", () => { lbIndex = i; renderLightbox(); });
    lbDots.appendChild(d);
  });
  lbPrev.style.display = lbImages.length > 1 ? "" : "none";
  lbNext.style.display = lbImages.length > 1 ? "" : "none";
}

lbPrev.addEventListener("click",  () => { lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length; renderLightbox(); });
lbNext.addEventListener("click",  () => { lbIndex = (lbIndex + 1) % lbImages.length; renderLightbox(); });
lbClose.addEventListener("click", closeLightbox);
lbBack.addEventListener("click",  closeLightbox);

document.addEventListener("keydown", e => {
  if (lightbox.style.display !== "flex") return;
  if (e.key === "ArrowLeft")  { lbIndex = (lbIndex-1+lbImages.length)%lbImages.length; renderLightbox(); }
  if (e.key === "ArrowRight") { lbIndex = (lbIndex+1)%lbImages.length; renderLightbox(); }
  if (e.key === "Escape")     closeLightbox();
});


// ===================================================
//   TOGGLE IFRAMES
// ===================================================
document.querySelectorAll(".toggle-iframe").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    const open = target.style.display !== "none";
    target.style.display = open ? "none" : "block";
    const defaultLabel = btn.dataset.target === "iframe-cv" ? "Preview" : "View Slides";
    const hideLabel    = btn.dataset.target === "iframe-cv" ? "Hide Preview" : "Hide Slides";
    if (btn.dataset.target === "iframe-thesis") {
      btn.textContent = open ? "View Thesis" : "Hide Thesis";
    } else {
      btn.textContent = open ? defaultLabel : hideLabel;
    }
  });
});