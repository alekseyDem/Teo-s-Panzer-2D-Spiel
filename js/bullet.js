class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 15;
        this.radius = 4;
        this.color = '#ffcc00'; // Желтый
        this.lifetime = 100; // Время жизни пули в кадрах
    }

    update() {
        // Update bullet position multiple times for smoother, faster movement
        for (let i = 0; i < 2; i++) {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
        }
        this.lifetime--;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    isOutOfBounds(canvasWidth, canvasHeight) {
        return (
            this.x < 0 ||
            this.x > canvasWidth ||
            this.y < 0 ||
            this.y > canvasHeight ||
            this.lifetime <= 0
        );
    }
} 