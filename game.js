const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Constants ---
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;

canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;

// --- Colors ---
const BLACK = '#000';
const NEON_GREEN = '#39ff14';
const NEON_PINK = '#ff1493';
const NEON_BLUE = '#0ff';
const WHITE = '#fff';

// --- Game Settings ---
const PLAYER_SPEED = 5;
const PLAYER_BULLET_SPEED = 15;
const INVADER_BULLET_SPEED = 7;
const INVADER_SPEED = 1;
const BULLET_COOLDOWN = 100; // milliseconds
const AUTO_FIRE_ENABLED = true;

class Player {
    constructor(game) {
        this.game = game;
        this.width = 50;
        this.height = 30;
        this.x = (SCREEN_WIDTH - this.width) / 2;
        this.y = SCREEN_HEIGHT - this.height - 10;
        this.speed = PLAYER_SPEED;
        this.lastShot = 0;
    }

    draw(context) {
        context.fillStyle = NEON_BLUE;
        context.beginPath();
        context.moveTo(this.x + this.width / 2, this.y);
        context.lineTo(this.x, this.y + this.height);
        context.lineTo(this.x + this.width, this.y + this.height);
        context.closePath();
        context.fill();

        context.fillStyle = NEON_PINK;
        context.fillRect(this.x + 20, this.y + 10, 10, 10);
    }

    update() {
        if (this.game.keys['ArrowLeft'] && this.x > 0) {
            this.x -= this.speed;
        }
        if (this.game.keys['ArrowRight'] && this.x < SCREEN_WIDTH - this.width) {
            this.x += this.speed;
        }
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > BULLET_COOLDOWN) {
            this.lastShot = now;
            const bullet = new Bullet(this.game, this.x + this.width / 2, this.y, -PLAYER_BULLET_SPEED, NEON_BLUE);
            this.game.playerBullets.push(bullet);
        }
    }
}

class Bullet {
    constructor(game, x, y, speed, color) {
        this.game = game;
        this.width = 4;
        this.height = 20;
        this.x = x - this.width / 2;
        this.y = y;
        this.speed = speed;
        this.color = color;
        this.markedForDeletion = false;
    }

    update() {
        this.y += this.speed;
        if (this.y < 0 || this.y > SCREEN_HEIGHT) {
            this.markedForDeletion = true;
        }
    }

    draw(context) {
        context.fillStyle = this.color;
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Invader {
    constructor(game, x, y, invaderType) {
        this.game = game;
        this.width = 30;
        this.height = 30;
        this.x = x;
        this.y = y;
        this.invaderType = invaderType;
        this.markedForDeletion = false;
        this.animationFrame = 0;
        this.lastAnimation = 0;
    }

    update(deltaTime) {
        if (Date.now() - this.lastAnimation > 500) {
            this.lastAnimation = Date.now();
            this.animationFrame = 1 - this.animationFrame;
        }
    }

    draw(context) {
        const color = this.invaderType === 1 ? NEON_GREEN : NEON_PINK;
        context.fillStyle = color;
        if (this.invaderType === 1) {
            if (this.animationFrame === 0) {
                context.fillRect(this.x + 5, this.y + 5, 20, 20);
            } else {
                context.fillRect(this.x, this.y, 30, 30);
            }
        } else {
            context.beginPath();
            if (this.animationFrame === 0) {
                context.moveTo(this.x + 15, this.y);
                context.lineTo(this.x, this.y + 15);
                context.lineTo(this.x + 30, this.y + 15);
            } else {
                context.moveTo(this.x + 15, this.y + 5);
                context.lineTo(this.x, this.y + 20);
                context.lineTo(this.x + 30, this.y + 20);
            }
            context.closePath();
            context.fill();
        }
    }
}

class BarrierPart {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.health = 5;
        this.markedForDeletion = false;
    }

    draw(context) {
        context.fillStyle = NEON_GREEN;
        context.globalAlpha = this.health / 5;
        context.fillRect(this.x, this.y, this.width, this.height);
        context.globalAlpha = 1.0;
    }

    hit() {
        this.health--;
        if (this.health <= 0) {
            this.markedForDeletion = true;
        }
    }
}

class Game {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.player = new Player(this);
        this.keys = {};
        this.invaders = [];
        this.playerBullets = [];
        this.invaderBullets = [];
        this.barriers = [];

        this.invaderDirection = 1;
        this.invaderMoveDown = 0;
        this.invaderShootTimer = 0;
        this.invaderShootInterval = 1000;

        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.gameWon = false;

        this.createInvaders();
        this.createBarriers();

        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            if (!AUTO_FIRE_ENABLED && e.key === ' ' && !this.gameOver) {
                this.player.shoot();
            }
            if ((this.gameOver || this.gameWon) && e.key.toLowerCase() === 'r') {
                this.restart();
            }
        });
        window.addEventListener('keyup', e => {
            this.keys[e.key] = false;
        });

        // On-screen controls
        const leftBtn = document.getElementById('left-btn');
        const rightBtn = document.getElementById('right-btn');
        const fireBtn = document.getElementById('fire-btn');

        const handlePress = (e, key, isPressed) => {
            e.preventDefault();
            this.keys[key] = isPressed;
        };

        // Left Button
        leftBtn.addEventListener('mousedown', e => handlePress(e, 'ArrowLeft', true));
        leftBtn.addEventListener('mouseup', e => handlePress(e, 'ArrowLeft', false));
        leftBtn.addEventListener('mouseleave', e => handlePress(e, 'ArrowLeft', false));
        leftBtn.addEventListener('touchstart', e => handlePress(e, 'ArrowLeft', true), { passive: true });
        leftBtn.addEventListener('touchend', e => handlePress(e, 'ArrowLeft', false));

        // Right Button
        rightBtn.addEventListener('mousedown', e => handlePress(e, 'ArrowRight', true));
        rightBtn.addEventListener('mouseup', e => handlePress(e, 'ArrowRight', false));
        rightBtn.addEventListener('mouseleave', e => handlePress(e, 'ArrowRight', false));
        rightBtn.addEventListener('touchstart', e => handlePress(e, 'ArrowRight', true), { passive: true });
        rightBtn.addEventListener('touchend', e => handlePress(e, 'ArrowRight', false));

        // Fire Button
        fireBtn.addEventListener('mousedown', e => handlePress(e, ' ', true));
        fireBtn.addEventListener('mouseup', e => handlePress(e, ' ', false));
        fireBtn.addEventListener('mouseleave', e => handlePress(e, ' ', false));
        fireBtn.addEventListener('touchstart', e => handlePress(e, ' ', true), { passive: true });
        fireBtn.addEventListener('touchend', e => handlePress(e, ' ', false));
    }

    restart() {
        this.player = new Player(this);
        this.invaders = [];
        this.playerBullets = [];
        this.invaderBullets = [];
        this.barriers = [];
        this.createInvaders();
        this.createBarriers();
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.gameWon = false;
    }

    createInvaders() {
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 10; col++) {
                const invaderType = row < 2 ? 1 : 2;
                const x = 100 + col * 50;
                const y = 50 + row * 50;
                this.invaders.push(new Invader(this, x, y, invaderType));
            }
        }
    }

    createBarriers() {
        for (let i = 0; i < 4; i++) {
            const barrierX = (this.width / 4) * i + (this.width / 8);
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 5; col++) {
                    const x = barrierX + col * 10;
                    const y = this.height - 150 + row * 10;
                    this.barriers.push(new BarrierPart(this, x, y));
                }
            }
        }
    }

    update(deltaTime) {
        if (this.gameOver || this.gameWon) return;

        this.player.update();
        if (AUTO_FIRE_ENABLED && this.keys[' ']) {
            this.player.shoot();
        }

        this.playerBullets.forEach(b => b.update());
        this.invaderBullets.forEach(b => b.update());
        this.invaders.forEach(i => i.update(deltaTime));

        this.playerBullets = this.playerBullets.filter(b => !b.markedForDeletion);
        this.invaderBullets = this.invaderBullets.filter(b => !b.markedForDeletion);
        this.invaders = this.invaders.filter(i => !i.markedForDeletion);
        this.barriers = this.barriers.filter(b => !b.markedForDeletion);

        // Move invaders
        let shouldMoveDown = false;
        this.invaders.forEach(invader => {
            if ((invader.x <= 0 && this.invaderDirection === -1) || (invader.x + invader.width >= this.width && this.invaderDirection === 1)) {
                shouldMoveDown = true;
            }
        });

        if (shouldMoveDown) {
            this.invaderDirection *= -1;
            this.invaders.forEach(invader => invader.y += 10);
        }

        this.invaders.forEach(invader => {
            invader.x += this.invaderDirection * INVADER_SPEED;
            if (invader.y + invader.height >= this.height - 50) {
                this.gameOver = true;
            }
        });

        // Invader shoot
        this.invaderShootTimer += deltaTime;
        if (this.invaderShootTimer > this.invaderShootInterval && this.invaders.length > 0) {
            this.invaderShootTimer = 0;
            const randomInvader = this.invaders[Math.floor(Math.random() * this.invaders.length)];
            const bullet = new Bullet(this, randomInvader.x + randomInvader.width / 2, randomInvader.y + randomInvader.height, INVADER_BULLET_SPEED, NEON_PINK);
            this.invaderBullets.push(bullet);
        }

        // Collisions
        this.handleCollisions();
        
        if(this.invaders.length === 0 && !this.gameWon){
            this.gameWon = true;
        }
    }

    handleCollisions() {
        // Player bullets vs Invaders
        this.playerBullets.forEach(bullet => {
            this.invaders.forEach(invader => {
                if (this.checkCollision(bullet, invader)) {
                    invader.markedForDeletion = true;
                    bullet.markedForDeletion = true;
                    this.score += 100;
                }
            });
        });

        // Invader bullets vs Player
        this.invaderBullets.forEach(bullet => {
            if (this.checkCollision(bullet, this.player)) {
                bullet.markedForDeletion = true;
                this.lives--;
                if (this.lives <= 0) {
                    this.gameOver = true;
                }
            }
        });

        // Bullets vs Barriers
        this.playerBullets.forEach(bullet => {
            this.barriers.forEach(barrier => {
                if (this.checkCollision(bullet, barrier)) {
                    bullet.markedForDeletion = true;
                    barrier.hit();
                }
            });
        });
        this.invaderBullets.forEach(bullet => {
            this.barriers.forEach(barrier => {
                if (this.checkCollision(bullet, barrier)) {
                    bullet.markedForDeletion = true;
                    barrier.hit();
                }
            });
        });
        
        // Invaders vs Barriers
        this.invaders.forEach(invader => {
            this.barriers.forEach(barrier => {
                if(this.checkCollision(invader, barrier)){
                    barrier.markedForDeletion = true;
                }
            });
        });
    }

    checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    draw(context) {
        context.clearRect(0, 0, this.width, this.height);
        this.player.draw(context);
        this.playerBullets.forEach(b => b.draw(context));
        this.invaderBullets.forEach(b => b.draw(context));
        this.invaders.forEach(i => i.draw(context));
        this.barriers.forEach(b => b.draw(context));

        // Draw UI
        context.fillStyle = WHITE;
        context.font = '24px "Courier New", Courier, monospace';
        context.fillText(`Score: ${this.score}`, 20, 40);
        context.fillText(`Lives: ${this.lives}`, this.width - 120, 40);

        if (this.gameOver) {
            this.showMessage(context, 'GAME OVER', 'Press R to Restart');
        } else if (this.gameWon) {
            this.showMessage(context, 'YOU WIN!', 'Press R to Restart');
        }
    }

    showMessage(context, largeText, smallText) {
        context.textAlign = 'center';
        context.fillStyle = NEON_PINK;
        context.font = '72px "Courier New", Courier, monospace';
        context.fillText(largeText, this.width / 2, this.height / 2 - 40);
        context.fillStyle = WHITE;
        context.font = '36px "Courier New", Courier, monospace';
        context.fillText(smallText, this.width / 2, this.height / 2 + 20);
        context.textAlign = 'left';
    }
}

const game = new Game(SCREEN_WIDTH, SCREEN_HEIGHT);
let lastTime = 0;

function animate(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    game.update(deltaTime);
    game.draw(ctx);
    requestAnimationFrame(animate);
}

animate(0);
