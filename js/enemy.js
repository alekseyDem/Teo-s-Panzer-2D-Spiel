class Enemy {
    constructor(x, y, levelIndex = 0) {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE * 0.8; // Немного меньше клетки
        this.height = TILE_SIZE * 0.8;
        this.color = '#dc143c'; // Crimson red
        this.health = 1; // Враг уничтожается с одного попадания

        // Для движения
        this.speed = TILE_SIZE; // Движется на одну клетку
        this.angle = Math.PI / 2; // Начинает смотреть вниз
        this.intendedAngle = this.angle;
        this.moveCooldown = 0;
        this.maxMoveCooldown = Math.max(10, 24 - Math.floor(levelIndex / 5)); // было 24, уменьшается каждые 5 уровней, минимум 10
        this.decisionCooldown = 0;
        this.maxDecisionCooldown = Math.max(20, 60 - Math.floor(levelIndex / 3)); // было 60, уменьшается каждые 3 уровня, минимум 20

        // Сохраняем индекс для возможного использования в будущем
        this.levelIndex = levelIndex;
    }

    update() {
        // Уменьшаем кулдауны
        if (this.moveCooldown > 0) {
            this.moveCooldown--;
        }
        if (this.decisionCooldown > 0) {
            this.decisionCooldown--;
        }

        // Принятие решения о новом направлении
        if (this.decisionCooldown <= 0) {
            const directions = [0, Math.PI / 2, Math.PI, -Math.PI / 2]; // Право, Низ, Лево, Верх
            this.intendedAngle = directions[Math.floor(Math.random() * directions.length)];
            this.decisionCooldown = this.maxDecisionCooldown + Math.random() * 40; // Случайная задержка для следующего решения
        }

        // Попытка движения
        if (this.moveCooldown <= 0) {
            // 1. Поворачиваемся в сторону намерения
            this.angle = this.intendedAngle;

            // 2. Определяем смещение
            let moveX = 0;
            let moveY = 0;
            if (this.angle === 0) moveX = this.speed; // Право
            else if (this.angle === Math.PI) moveX = -this.speed; // Лево
            else if (this.angle === -Math.PI / 2) moveY = -this.speed; // Верх
            else if (this.angle === Math.PI / 2) moveY = this.speed; // Низ

            if (moveX !== 0 || moveY !== 0) {
                const targetX = this.x + moveX;
                const targetY = this.y + moveY;

                // 3. Проверяем столкновение в целевой клетке
                if (!isCollision(targetX, targetY)) {
                    // 4. Двигаемся
                    this.x = targetX;
                    this.y = targetY;
                }
                // 5. Сбрасываем кулдаун движения (даже если не подвинулись)
                this.moveCooldown = this.maxMoveCooldown;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Корпус врага
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // "Глаз" для указания направления
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.width * 0.1, -this.height * 0.1, this.width * 0.3, this.height * 0.2);

        ctx.restore();
    }

    takeDamage() {
        this.health--;
    }

    isAlive() {
        return this.health > 0;
    }

    // Проверка столкновения точки (например, центра снаряда) с врагом
    isHit(pointX, pointY) {
        // Проверка столкновения с учетом поворота (приблизительная)
        // Преобразуем точку попадания в локальные координаты врага
        const dx = pointX - this.x;
        const dy = pointY - this.y;
        const localX = dx * Math.cos(-this.angle) - dy * Math.sin(-this.angle);
        const localY = dx * Math.sin(-this.angle) + dy * Math.cos(-this.angle);

        return (
            localX >= -this.width / 2 &&
            localX <= this.width / 2 &&
            localY >= -this.height / 2 &&
            localY <= this.height / 2
        );
    }
} 