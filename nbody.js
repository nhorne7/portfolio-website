const canvas = document.getElementById("nbody-canvas");
const ctx = canvas.getContext("2d");

// Resize and maintain full-screen canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Gravity constant
const G = 1;

// Generate particles
const particles = [];
for (let i = 0; i < 6; i++) {
    particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5),
        vy: (Math.random() - 0.5),
        mass: 10 + Math.random() * 10,
    });
}

// Physics update
function update() {
    for (let i = 0; i < particles.length; i++) {
        const pi = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
            const pj = particles[j];
            const dx = pj.x - pi.x;
            const dy = pj.y - pi.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq) + 0.1;
            const force = (G * pi.mass * pj.mass) / distSq;
            const ax = force * dx / dist / pi.mass;
            const ay = force * dy / dist / pi.mass;
            const bx = -force * dx / dist / pj.mass;
            const by = -force * dy / dist / pj.mass;
            pi.vx += ax;
            pi.vy += ay;
            pj.vx += bx;
            pj.vy += by;
        }
    }

    for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap-around screen
        if (p.x < 0) p.x += canvas.width;
        if (p.x > canvas.width) p.x -= canvas.width;
        if (p.y < 0) p.y += canvas.height;
        if (p.y > canvas.height) p.y -= canvas.height;
    }
}

// Render particles
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#2e2e27";
    for (let p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fill();
    }
}

// Animation loop
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();
