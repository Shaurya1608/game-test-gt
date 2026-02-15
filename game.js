const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const statusBadge = document.getElementById('status-badge');

let score = 0;
let gameActive = false;
let circles = [];

// Initialize SDK
GametSDK.init("neon-slayer", { debug: true });

GametSDK.on("ready", (data) => {
    statusBadge.textContent = "SECURE LINK: ACTIVE";
    statusBadge.classList.add('connected');
    console.log("[Neon Slayer] SDK Synced:", data);
});

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Orb {
    constructor() {
        this.radius = Math.random() * 30 + 20;
        this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = Math.random() * (canvas.height - this.radius * 2) + this.radius;
        this.color = `hsl(${Math.random() * 60 + 280}, 80%, 60%)`;
        this.speedX = (Math.random() - 0.5) * 4;
        this.speedY = (Math.random() - 0.5) * 4;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.closePath();
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) this.speedX *= -1;
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) this.speedY *= -1;
    }
}

function spawnOrb() {
    if (circles.length < 10) {
        circles.push(new Orb());
    }
}

function animate() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    circles.forEach(orb => {
        orb.update();
        orb.draw();
    });

    requestAnimationFrame(animate);
}

canvas.addEventListener('mousedown', (e) => {
    if (!gameActive) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    circles = circles.filter(orb => {
        const dist = Math.sqrt((mouseX - orb.x)**2 + (mouseY - orb.y)**2);
        if (dist < orb.radius) {
            score += 10;
            scoreEl.textContent = score;
            
            // REPORT SCORE TO GAMERTHRED
            GametSDK.reportScoreUpdate(score);
            
            return false;
        }
        return true;
    });

    if (circles.length < 5) spawnOrb();
});

document.getElementById('start-btn').addEventListener('click', () => {
    gameActive = true;
    score = 0;
    scoreEl.textContent = score;
    circles = [];
    for(let i=0; i<8; i++) spawnOrb();
    startScreen.classList.add('hidden');
    animate();

    // Start Session in SDK
    GametSDK.matchStart();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    gameActive = true;
    score = 0;
    scoreEl.textContent = score;
    circles = [];
    for(let i=0; i<8; i++) spawnOrb();
    animate();
});

// Simple Game Over after 15 seconds
setTimeout(() => {
    setInterval(() => {
        if(gameActive && score > 200) {
             gameActive = false;
             document.getElementById('final-score').textContent = score;
             gameOverScreen.classList.remove('hidden');
             
             // FINAL SCORE SUBMISSION
             GametSDK.matchEnd({ score: score });
        }
    }, 1000);
}, 5000);
