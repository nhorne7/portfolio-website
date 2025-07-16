const canvas = document.getElementById("pendulums");
const ctx = canvas.getContext("2d");

const g = 9.81;
const metersToPixels = 200;
const dt = 1 / 60;
const dragRadius = 20;
let startTime = null;
const PendFadeDuration = 0.0;

class DoublePendulum {
  constructor(origin, L1, L2, m1, m2, theta1, theta2, color = "#1B1B1B") {
    this.origin = origin;
    this.L1 = L1;
    this.L2 = L2;
    this.m1 = m1;
    this.m2 = m2;
    this.theta1 = theta1;
    this.theta2 = theta2;
    this.omega1 = 0;
    this.omega2 = 0;
    this.color = color;
    this.trace = [];
    this.isDragging = false;
    this.isHovered = false;
  }

  update() {
    if (this.isDragging) {
      this.omega1 = 0;
      this.omega2 = 0;
      return;
    }

    const { theta1, theta2, omega1, omega2, m1, m2, L1, L2 } = this;

    const delta = theta1 - theta2;
    const sinDelta = Math.sin(delta);
    const cosDelta = Math.cos(delta);

    const den1 = (2 * m1 + m2 - m2 * Math.cos(2 * delta));
    const den2 = L2 * den1;
    const den1Full = L1 * den1;

    const a1 = (
      -g * (2 * m1 + m2) * Math.sin(theta1)
      - m2 * g * Math.sin(theta1 - 2 * theta2)
      - 2 * sinDelta * m2 * (omega2 ** 2 * L2 + omega1 ** 2 * L1 * cosDelta)
    ) / den1Full;

    const a2 = (
      2 * sinDelta * (
        omega1 ** 2 * L1 * (m1 + m2)
        + g * (m1 + m2) * Math.cos(theta1)
        + omega2 ** 2 * L2 * m2 * cosDelta
      )
    ) / den2;

    this.omega1 += a1 * dt;
    this.omega2 += a2 * dt;
    this.theta1 += this.omega1 * dt;
    this.theta2 += this.omega2 * dt;

    this.omega1 *= 0.999;
    this.omega2 *= 0.999;

    const bob2 = this.getBob2();
    this.trace.push(bob2);
    if (this.trace.length > 1000) this.trace.shift();
  }

  getBob1() {
    const x1 = this.origin.x + this.L1 * metersToPixels * Math.sin(this.theta1);
    const y1 = this.origin.y + this.L1 * metersToPixels * Math.cos(this.theta1);
    return { x: x1, y: y1 };
  }

  getBob2() {
    const b1 = this.getBob1();
    const x2 = b1.x + this.L2 * metersToPixels * Math.sin(this.theta2);
    const y2 = b1.y + this.L2 * metersToPixels * Math.cos(this.theta2);
    return { x: x2, y: y2 };
  }

  draw(ctx) {
    const bob1 = this.getBob1();
    const bob2 = this.getBob2();

    ctx.beginPath();
    for (let i = 0; i < this.trace.length - 1; i++) {
      const p1 = this.trace[i];
      const p2 = this.trace[i + 1];
      ctx.strokeStyle = "#C4C5BA";
      ctx.lineWidth = 1;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    ctx.strokeStyle = "#1B1B1B";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.origin.x, this.origin.y);
    ctx.lineTo(bob1.x, bob1.y);
    ctx.lineTo(bob2.x, bob2.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(bob1.x, bob1.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#1B1B1B";
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(bob2.x, bob2.y);

    const dx = bob2.x - bob1.x;
    const dy = bob2.y - bob1.y;
    const angle = Math.atan2(dy, dx);
    ctx.rotate(angle + Math.PI / 2);

    ctx.scale(-1, -1);

    ctx.fillStyle = this.isHovered ? "rgb(58, 105, 66)" : this.color;
    ctx.font = "bold 32px Helvetica";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.letter, 0, 0);
    ctx.restore();
  }

  dragTo(x, y) {
    const ox = this.origin.x;
    const oy = this.origin.y;

    const dx = x - ox;
    const dy = y - oy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const L1px = this.L1 * metersToPixels;
    const L2px = this.L2 * metersToPixels;

    const d = Math.min(dist, L1px + L2px - 0.01);
    const d_clamped = Math.max(d, Math.abs(L1px - L2px) + 0.01);

    const angleToMouse = Math.atan2(dx, dy);

    const cosA = (L1px * L1px + L2px * L2px - d_clamped * d_clamped) / (2 * L1px * L2px);
    const angleA = Math.acos(Math.min(1, Math.max(-1, cosA)));
    const theta2Offset = Math.PI - angleA;

    const cosB = (L1px * L1px + d_clamped * d_clamped - L2px * L2px) / (2 * L1px * d_clamped);
    const angleB = Math.acos(Math.min(1, Math.max(-1, cosB)));

    const theta1a = angleToMouse + angleB;
    const theta1b = angleToMouse - angleB;

    const normalizeAngle = (a) => {
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      return a;
    };

    const simulateBob2 = (theta1_candidate) => {
      const x1 = ox + L1px * Math.sin(theta1_candidate);
      const y1 = oy + L1px * Math.cos(theta1_candidate);
      const theta2_candidate = normalizeAngle(theta1_candidate - theta2Offset);
      const x2 = x1 + L2px * Math.sin(theta2_candidate);
      const y2 = y1 + L2px * Math.cos(theta2_candidate);
      return { x: x2, y: y2, theta1: theta1_candidate, theta2: theta2_candidate };
    };

    const solA = simulateBob2(theta1a);
    const solB = simulateBob2(theta1b);

    const distA = Math.hypot(solA.x - x, solA.y - y);
    const distB = Math.hypot(solB.x - x, solB.y - y);

    const best = distA < distB ? solA : solB;

    this.theta1 = normalizeAngle(best.theta1);
    this.theta2 = normalizeAngle(best.theta2);
    this.omega1 = 0;
    this.omega2 = 0;
  }
}

// === MOBILE DETECTION LOGIC ===
const isMobile = window.matchMedia("(max-width: 768px)").matches;
const group1 = "noah";
const group2 = isMobile ? "" : "horne";

// === Create Pendulums ===
const spacing = 60;
const groupGap = 130;

function createPendulumsFromLetters(letters, color = "#000000") {
  return letters.split("").map(letter => {
    return {
      letter,
      theta1: 0.1 * (Math.random() * 0.4 + 0.05),
      theta2: 0.1 * (Math.random() * 0.4 + 0.05),
      L1: 0.6,
      L2: 0.2 + (Math.random() * 0.1),
      color
    };
  });
}

const pendulums = [];

const group1Configs = createPendulumsFromLetters(group1);
const group2Configs = createPendulumsFromLetters(group2);

for (const cfg of group1Configs.concat(group2Configs)) {
  const origin = { x: 0, y: 140 };
  const dp = new DoublePendulum(
    origin,
    cfg.L1,
    cfg.L2,
    1.0,
    1.0,
    cfg.theta1,
    cfg.theta2,
    cfg.color
  );
  dp.letter = cfg.letter;
  pendulums.push(dp);
}

function alignPendulums() {
  const canvasWidth = canvas.clientWidth;
  const canvasHeight = canvas.clientHeight;

  const group1Length = group1.length;
  const group2Length = group2.length;

  const group1Width = (group1Length - 1) * spacing;
  const group2Width = (group2Length - 1) * spacing;

  const totalWidth = group1Width + group2Width + groupGap;
  const startX = canvasWidth / 2;

  const originY = canvasHeight * 0.15;

  for (let i = 0; i < group1Length; i++) {
    const p = pendulums[i];
    p.origin.x = startX + i * spacing;
    p.origin.y = originY;
    p.trace = [];
  }

  for (let i = 0; i < group2Length; i++) {
    const p = pendulums[group1Length + i];
    p.origin.x = startX + group1Width + groupGap + i * spacing;
    p.origin.y = originY;
    p.trace = [];
  }
}

function resize() {
  const dpr = window.devicePixelRatio || 1;

  const logicalWidth = window.innerWidth;
  const logicalHeight = 255;

  canvas.width = logicalWidth * dpr;
  canvas.height = logicalHeight * dpr;

  canvas.style.width = logicalWidth + "px";
  canvas.style.height = logicalHeight + "px";

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  alignPendulums();
}

window.addEventListener("resize", resize);
resize();

let draggingPendulum = null;

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  for (const p of pendulums) {
    const bob2 = p.getBob2();
    const dx = mouseX - bob2.x;
    const dy = mouseY - bob2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < dragRadius) {
      draggingPendulum = p;
      p.isDragging = true;
      p.trace = [];
      p.dragTo(mouseX, mouseY);
      break;
    }
  }
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (draggingPendulum) {
    draggingPendulum.dragTo(mouseX, mouseY);
  }

  for (const p of pendulums) {
    const bob2 = p.getBob2();
    const dx = mouseX - bob2.x;
    const dy = mouseY - bob2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    p.isHovered = dist < 20;
  }
});

canvas.addEventListener("mouseup", () => {
  if (draggingPendulum) {
    draggingPendulum.isDragging = false;
    draggingPendulum = null;
  }
});

canvas.addEventListener("mouseleave", () => {
  if (draggingPendulum) {
    draggingPendulum.isDragging = false;
    draggingPendulum = null;
  }
  for (const p of pendulums) {
    p.isHovered = false;
  }
});

let startTimeMs = performance.now();

function loop() {
  const elapsed = (performance.now() - startTimeMs) / 1000;
  const alpha = Math.min(1, elapsed / PendFadeDuration);

  ctx.fillStyle = "#E4E4DE";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const p of pendulums) {
    p.update();
    ctx.save();
    ctx.globalAlpha = alpha;
    p.draw(ctx);
    ctx.restore();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(() => loop());
