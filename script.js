// ===================================================
//  RUCKLIDGE ATTRACTOR  — hero background
// ===================================================
(function () {
  const ac   = document.getElementById("attractor-canvas");
  const actx = ac.getContext("2d");

  // Rucklidge parameters (κ=2, λ=6.7 — classic two-lobe chaotic attractor)
  const KAPPA  = 2.0;
  const LAMBDA = 6.7;
  const DT     = 0.0015;

  // Rolling trail buffer
  const TRAIL_LEN = 2200;
  const trail = [];

  // State
  let rx = 0.1, ry = 0.0, rz = 0.0;

  // Warm up so we land on the attractor before drawing
  for (let i = 0; i < 5000; i++) {
    const dx = -KAPPA * rx + LAMBDA * ry - ry * rz;
    const dy =  rx;
    const dz = -rz + ry * ry;
    rx += dx * DT;  ry += dy * DT;  rz += dz * DT;
  }

  // Project 3-D → 2-D with a mild isometric tilt
  // Attractor range: x,y ≈ [-3,3], z ≈ [0,8]
  function project(x, y, z, cx, cy, scale) {
    const px =  x * 0.85 - y * 0.30;
    const py = -z * 0.90 + x * 0.18 + y * 0.08;
    return { sx: cx + px * scale, sy: cy + py * scale };
  }

  // Size the canvas to exactly cover #intro
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

  const STEPS_PER_FRAME = 25;

  function attractorLoop() {
    for (let s = 0; s < STEPS_PER_FRAME; s++) {
      const dx = -KAPPA * rx + LAMBDA * ry - ry * rz;
      const dy =  rx;
      const dz = -rz + ry * ry;
      rx += dx * DT;  ry += dy * DT;  rz += dz * DT;
      trail.push({ x: rx, y: ry, z: rz });
      if (trail.length > TRAIL_LEN) trail.shift();
    }

    const W = ac.clientWidth;
    const H = ac.clientHeight;

    if (W === 0 || H === 0) {
      requestAnimationFrame(attractorLoop);
      return;
    }

    // Clear the full canvas in device pixels, bypassing the custom transform
    actx.save();
    actx.setTransform(1, 0, 0, 1, 0, 0);
    actx.clearRect(0, 0, ac.width, ac.height);
    actx.restore();

    if (trail.length < 2) {
      requestAnimationFrame(attractorLoop);
      return;
    }

    const cx    = W * 0.68;
    const cy    = H * 0.50;
    const scale = Math.min(W, H) * 0.11;

    const len = trail.length;
    actx.lineWidth = 1.4;
    actx.lineCap   = "round";

    for (let i = 1; i < len; i++) {
      const t     = i / len;
      const alpha = t * t * 0.72;
      const p0 = project(trail[i-1].x, trail[i-1].y, trail[i-1].z, cx, cy, scale);
      const p1 = project(trail[i  ].x, trail[i  ].y, trail[i  ].z, cx, cy, scale);
      actx.beginPath();
      actx.strokeStyle = `rgba(100,101,94,${alpha.toFixed(3)})`;
      actx.moveTo(p0.sx, p0.sy);
      actx.lineTo(p1.sx, p1.sy);
      actx.stroke();
    }

    // Moving dot at the head
    const head = trail[len - 1];
    const hp   = project(head.x, head.y, head.z, cx, cy, scale);
    actx.beginPath();
    actx.arc(hp.sx, hp.sy, 4, 0, Math.PI * 2);
    actx.fillStyle = "rgba(58,105,66,0.85)";
    actx.fill();

    // Rucklidge equations — anchored to a fixed point on the attractor
    const eq = project(0, 1.5, 4.0, cx, cy, scale);
    actx.save();
    actx.setTransform(1, 0, 0, 1, 0, 0);
    actx.font = "italic 30px Georgia, serif";
    actx.fillStyle = "rgba(155, 157, 146, 0.28)";
    actx.textAlign = "left";
    actx.textBaseline = "top";
    actx.fillText("ẋ = −κx + λy − yz", eq.sx + 250, eq.sy+800);
    actx.fillText("ẏ = x",              eq.sx + 250, eq.sy + 32+800);
    actx.fillText("ż = −z + y²",        eq.sx + 250, eq.sy + 64+800);
    actx.restore();

    requestAnimationFrame(attractorLoop);
  }

  requestAnimationFrame(attractorLoop);
})();
// ===================================================
//  PENDULUM SECTION
// ===================================================
const canvas = document.getElementById("pendulums");
const ctx    = canvas.getContext("2d");

const g           = 9.81;
const MTP         = 200;
const dt          = 1 / 60;
const DRAG_RADIUS = 22;

class DoublePendulum {
  constructor(origin, L1, L2, m1, m2, theta1, theta2, color = "#1B1B1B") {
    Object.assign(this, { origin, L1, L2, m1, m2, theta1, theta2, color });
    this.omega1 = 0; this.omega2 = 0;
    this.trace = []; this.isDragging = false; this.isHovered = false; this.letter = "";
    // Cursor velocity tracking for momentum transfer on release
    this._prevDragX = null; this._prevDragY = null;
    this._cursorVX = 0; this._cursorVY = 0;
  }

  update() {
    if (this.isDragging) { this.omega1 = this.omega2 = 0; return; }
    const { theta1, theta2, omega1, omega2, m1, m2, L1, L2 } = this;
    const delta = theta1 - theta2, sinD = Math.sin(delta), cosD = Math.cos(delta);
    const denom = 2*m1 + m2 - m2*Math.cos(2*delta);
    const a1 = (-g*(2*m1+m2)*Math.sin(theta1) - m2*g*Math.sin(theta1-2*theta2)
               - 2*sinD*m2*(omega2**2*L2 + omega1**2*L1*cosD)) / (L1*denom);
    const a2 = (2*sinD*(omega1**2*L1*(m1+m2) + g*(m1+m2)*Math.cos(theta1)
               + omega2**2*L2*m2*cosD)) / (L2*denom);
    this.omega1 = (this.omega1 + a1*dt) * 0.999;
    this.omega2 = (this.omega2 + a2*dt) * 0.999;
    this.theta1 += this.omega1*dt; this.theta2 += this.omega2*dt;
    const b2 = this.getBob2();
    this.trace.push(b2);
    if (this.trace.length > 1000) this.trace.shift();
  }

  getBob1() { return { x: this.origin.x + this.L1*MTP*Math.sin(this.theta1), y: this.origin.y + this.L1*MTP*Math.cos(this.theta1) }; }
  getBob2() { const b1 = this.getBob1(); return { x: b1.x + this.L2*MTP*Math.sin(this.theta2), y: b1.y + this.L2*MTP*Math.cos(this.theta2) }; }

  draw(ctx) {
    const bob1 = this.getBob1(), bob2 = this.getBob2();
    if (this.trace.length > 1) {
      ctx.beginPath(); ctx.strokeStyle = "#C4C5BA"; ctx.lineWidth = 1;
      for (let i = 0; i < this.trace.length-1; i++) { ctx.moveTo(this.trace[i].x, this.trace[i].y); ctx.lineTo(this.trace[i+1].x, this.trace[i+1].y); }
      ctx.stroke();
    }
    ctx.strokeStyle = "#1B1B1B"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(this.origin.x, this.origin.y); ctx.lineTo(bob1.x, bob1.y); ctx.lineTo(bob2.x, bob2.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(bob1.x, bob1.y, 4, 0, Math.PI*2); ctx.fillStyle = "#1B1B1B"; ctx.fill();
    const angle = Math.atan2(bob2.x-bob1.x, bob2.y-bob1.y);
    ctx.save(); ctx.translate(bob2.x, bob2.y); ctx.rotate(angle + Math.PI); ctx.scale(-1,-1);
    ctx.fillStyle = this.isHovered ? "rgb(58,105,66)" : this.color;
    ctx.font = "bold 32px Helvetica"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(this.letter, 0, 0); ctx.restore();
  }

  dragTo(x, y) {
    // Track cursor velocity (pixels per frame) for momentum transfer
    if (this._prevDragX !== null) {
      // Exponential smoothing to reduce jitter
      const alpha = 0.35;
      this._cursorVX = alpha * (x - this._prevDragX) + (1 - alpha) * this._cursorVX;
      this._cursorVY = alpha * (y - this._prevDragY) + (1 - alpha) * this._cursorVY;
    }
    this._prevDragX = x;
    this._prevDragY = y;

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

  // Convert tracked cursor velocity into angular velocities on release
  releaseWithMomentum() {
    const vx = this._cursorVX;
    const vy = this._cursorVY;

    if (Math.hypot(vx, vy) > 0.5) {
      const { x:ox, y:oy } = this.origin;
      const L1px = this.L1 * MTP;
      const L2px = this.L2 * MTP;

      // Bob positions at release
      const b1x = ox + L1px * Math.sin(this.theta1);
      const b1y = oy + L1px * Math.cos(this.theta1);
      const b2x = b1x + L2px * Math.sin(this.theta2);
      const b2y = b1y + L2px * Math.cos(this.theta2);

      // Arm 1 tangent direction (perpendicular to the rod, positive = increasing theta1)
      const t1x =  Math.cos(this.theta1);
      const t1y = -Math.sin(this.theta1);

      // Arm 2 tangent direction (perpendicular to rod 2, positive = increasing theta2)
      const t2x =  Math.cos(this.theta2);
      const t2y = -Math.sin(this.theta2);

      // Project cursor velocity onto each tangent, divide by arm length to get angular velocity
      // Scale factor converts px/frame → rad/frame; divide by dt to get rad/s equivalent used by integrator
      const scale = 1.0 / dt;
      this.omega1 = (vx * t1x + vy * t1y) / L1px * scale * 0.5;
      this.omega2 = (vx * t2x + vy * t2y) / L2px * scale * 0.5;
    }

    // Reset tracking state
    this._prevDragX = null;
    this._prevDragY = null;
    this._cursorVX  = 0;
    this._cursorVY  = 0;
  }
}

const isMobile = window.matchMedia("(max-width: 768px)").matches;
const word1 = "noah", word2 = isMobile ? "" : "horne";

function makePendulums(word) {
  return word.split("").map(letter => {
    const dp = new DoublePendulum({x:0,y:0}, 0.6, 0.2+Math.random()*0.1, 1, 1,
      0.1*(Math.random()*0.4+0.05), 0.1*(Math.random()*0.4+0.05), "#1B1B1B");
    dp.letter = letter; return dp;
  });
}
const pendulums = [...makePendulums(word1), ...makePendulums(word2)];

function alignPendulums() {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const spacing = 60, gap = 130;
  // originY — keep it near top so bobs hang into/behind header
  const oy = H * 0.12;
  const g1L = word1.length, g2L = word2.length;
  const w1 = (g1L-1)*spacing, w2 = (g2L-1)*spacing;
  if (g2L === 0) {
    const sx = W/2 - w1/2;
    pendulums.slice(0,g1L).forEach((p,i)=>{ p.origin.x=sx+i*spacing; p.origin.y=oy; p.trace=[]; });
  } else {
    const total = w1+w2+gap, sx = W/2 - total/2;
    pendulums.slice(0,g1L).forEach((p,i)=>{ p.origin.x=sx+i*spacing; p.origin.y=oy; p.trace=[]; });
    pendulums.slice(g1L).forEach((p,i)=>{ p.origin.x=sx+w1+gap+i*spacing; p.origin.y=oy; p.trace=[]; });
  }
}

function resizePendulumCanvas() {
  const dpr = window.devicePixelRatio||1;
  canvas.width = window.innerWidth*dpr;
  canvas.height = 295*dpr;
  canvas.style.width = window.innerWidth+"px";
  canvas.style.height = "295px";
  ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);
  alignPendulums();
}
window.addEventListener("resize", resizePendulumCanvas);
resizePendulumCanvas();

let draggingPendulum = null;
function getCanvasPos(e) { const r=canvas.getBoundingClientRect(),src=e.touches?e.touches[0]:e; return {x:src.clientX-r.left,y:src.clientY-r.top}; }

canvas.addEventListener("mousedown", e=>{ const{x,y}=getCanvasPos(e); for(const p of pendulums){const b2=p.getBob2(); if(Math.hypot(x-b2.x,y-b2.y)<DRAG_RADIUS){draggingPendulum=p;p.isDragging=true;p.trace=[];p._prevDragX=null;p._prevDragY=null;p._cursorVX=0;p._cursorVY=0;p.dragTo(x,y);break;}} });
canvas.addEventListener("mousemove", e=>{ const{x,y}=getCanvasPos(e); if(draggingPendulum)draggingPendulum.dragTo(x,y); for(const p of pendulums)p.isHovered=Math.hypot(x-p.getBob2().x,y-p.getBob2().y)<22; });
canvas.addEventListener("mouseup", ()=>{ if(draggingPendulum){draggingPendulum.releaseWithMomentum();draggingPendulum.isDragging=false;draggingPendulum=null;} });
canvas.addEventListener("mouseleave", ()=>{ if(draggingPendulum){draggingPendulum.releaseWithMomentum();draggingPendulum.isDragging=false;draggingPendulum=null;} pendulums.forEach(p=>p.isHovered=false); });
canvas.addEventListener("touchstart",e=>{e.preventDefault();const{x,y}=getCanvasPos(e);for(const p of pendulums){const b2=p.getBob2();if(Math.hypot(x-b2.x,y-b2.y)<DRAG_RADIUS){draggingPendulum=p;p.isDragging=true;p.trace=[];p._prevDragX=null;p._prevDragY=null;p._cursorVX=0;p._cursorVY=0;p.dragTo(x,y);break;}}},{passive:false});
canvas.addEventListener("touchmove",e=>{e.preventDefault();if(draggingPendulum){const{x,y}=getCanvasPos(e);draggingPendulum.dragTo(x,y);}},{passive:false});
canvas.addEventListener("touchend",e=>{e.preventDefault();if(draggingPendulum){draggingPendulum.releaseWithMomentum();draggingPendulum.isDragging=false;draggingPendulum=null;}},{passive:false});
canvas.addEventListener("touchcancel",e=>{e.preventDefault();if(draggingPendulum){draggingPendulum.releaseWithMomentum();draggingPendulum.isDragging=false;draggingPendulum=null;}},{passive:false});

function pendulumLoop() {
  // Draw with semi-transparent fill so traces show through header
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "rgba(228,228,222,0)"; // fully transparent — let the page bg show
  ctx.fillRect(0,0,canvas.width,canvas.height);
  pendulums.forEach(p=>{ p.update(); p.draw(ctx); });
  requestAnimationFrame(pendulumLoop);
}
requestAnimationFrame(pendulumLoop);


// ===================================================
//  SPRING HEADER — shared class
// ===================================================
class SpringHeader {
  constructor(canvasId, label, icon = "\u21C6") {
    this.canvas = document.getElementById(canvasId);
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
    ctx.clearRect(0,0,W,H);
    const{left,right}=this._anchors(), hw=110;
    ctx.strokeStyle="#C4C5BA"; ctx.lineWidth=3;
    this._drawZigzag(left,this.massY,this.massX-hw,this.massY);
    this._drawZigzag(right,this.massY,this.massX+hw,this.massY);
    ctx.fillStyle="rgb(58,105,66)"; ctx.font="bold 56px Helvetica";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(this.icon, this.massX, this.massY-36);
    ctx.fillStyle="#1B1B1B"; ctx.font="bold 46px Helvetica";
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
//  SCROLL-IN ANIMATIONS for experience cards
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
//  GALLERY / LIGHTBOX
// ===================================================
let lbImages = [], lbIndex = 0;
const lightbox  = document.getElementById("lightbox");
const lbImg     = lightbox.querySelector(".lb-img");
const lbDots    = lightbox.querySelector(".lb-dots");
const lbPrev    = lightbox.querySelector(".lb-prev");
const lbNext    = lightbox.querySelector(".lb-next");
const lbClose   = lightbox.querySelector(".lb-close");
const lbBack    = lightbox.querySelector(".lightbox-backdrop");

// Build gallery strips for each exp-card
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
//  TOGGLE IFRAMES
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
